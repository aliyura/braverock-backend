import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { In, Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import {
  ActionType,
  NotificationCategory,
  NotificationPriority,
  StateStatus,
  TargetType,
  TransactionType,
  UserRole,
} from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import { Incident } from 'src/schemas/incident.schema';
import { NotificationDto } from 'src/dtos/notification.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { UpdateStatusDto } from 'src/dtos/master';
import { IncidentDto, UpdateIncidentDto } from 'src/dtos/incident.dto';
import { AccountTransaction } from 'src/schemas/accounting/account-transaction.schema';
import { AccountService } from '../account/account.service';
import { Account } from 'src/schemas/accounting/account.schema';

@Injectable()
export class IncidentService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Incident) private incidentRepo: Repository<Incident>,
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    private readonly queueProducerService: ProducerService,
    private readonly accountService: AccountService,
  ) {}

  async addIncident(
    authenticatedUser: User,
    requestDto: IncidentDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role == UserRole.CLIENT ||
        authenticatedUser.role == UserRole.AGENT
      )
        return Response.failure(Messages.NoPermission);

      const request = {
        ...requestDto,
        status: StateStatus.PENDING,
        createdById: authenticatedUser.id,
      } as unknown as Incident;

      const savedIncident = await this.incidentRepo.save(request);
      if (savedIncident) {
        return Response.success(savedIncident);
      } else {
        return Response.failure('Unable to add incident');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateIncident(
    incidentId: number,
    authenticatedUser: User,
    requestDto: UpdateIncidentDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role == UserRole.CLIENT ||
        authenticatedUser.role == UserRole.AGENT
      )
        return Response.failure(Messages.NoPermission);

      const incident = await this.incidentRepo.findOne({
        where: { id: incidentId },
      });
      if (!incident) return Response.failure(Messages.IncidentNotAvailable);

      const updateRequest = {
        ...incident,
        ...requestDto,
      } as Incident;

      const updateHistory = {
        ...requestDto,
        actionType: ActionType.UPDATE,
        actionDate: new Date(),
        actionBy: authenticatedUser.id,
        actionByUser: authenticatedUser.name,
      };

      if (updateRequest.updateHistory == null)
        updateRequest.updateHistory = [updateHistory];
      else updateRequest.updateHistory.push(updateHistory);

      await this.incidentRepo.update({ id: incidentId }, updateRequest);
      const updatedUser = await this.incidentRepo.findOne({
        where: { id: incidentId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async changeIncidentStatus(
    authenticatedUser: User,
    incidentId: number,
    requestDto: UpdateStatusDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.LEADENGINEER &&
        authenticatedUser.role != UserRole.ACCOUNTANT &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const incident = await this.incidentRepo.findOne({
        where: { id: incidentId },
        relations: { createdBy: true },
      });

      let statusText = 'Your incident status has been changed';
      let subject = 'Incident Status Change';

      if (requestDto.status == StateStatus.APPROVED) {
        const account = await this.accountRepo.findOne({
          where: { userId: incident.createdById },
        });
        if (!account) return Response.failure(Messages.AccountNotFound);

        const approvedAmount = requestDto.amount || incident.amount;
        incident.approvedAmount = approvedAmount;
        incident.status = requestDto.status;
        incident.approvedById = authenticatedUser.id;
        incident.approvedDate = new Date();

        account.balance = Number(account.balance) + approvedAmount;
        this.accountRepo.save(account);

        const payableRequest = {
          accountId: account.id,
          amount: approvedAmount,
          status: StateStatus.APPROVED,
          type: TransactionType.CREDIT,
          targetType: TargetType.INCIDENT,
          incidentId: incident.id,
          reason: incident.title,
          userId: incident.createdById,
          createdById: authenticatedUser.id,
        } as unknown as AccountTransaction;

        await this.accountService.addPayable(authenticatedUser, payableRequest);

        statusText = 'Your incident has been approved';
        subject = 'Incident Approved';
      } else if (requestDto.status == StateStatus.DECLINED) {
        incident.status = requestDto.status;
        incident.approvedById = authenticatedUser.id;
        incident.rejectedDate = new Date();
        statusText = 'Your incident has been rejected';
        subject = 'Incident Rejected';
      } else {
        return Response.failure(Messages.InvalidStatus);
      }
      await this.incidentRepo.save(incident);

      const incidentOwner = incident.createdBy as User;
      const statusChangeRemark = `
         ${statusText}\n 
         Additional details:\n
         ${requestDto.statusReason}\n
      `;

      const notification = {
        from: 0,
        to: incidentOwner,
        subject: subject,
        body: statusChangeRemark,
        category: NotificationCategory.STATUSCHANGE,
        date: new Date(),
        enableEmail: true,
        enableSMS: true,
        enableInApp: false,
        priority: NotificationPriority.HIGH,
      } as unknown as NotificationDto;

      this.queueProducerService.publishNotification(notification);

      return Response.success(Messages.StatusChanged);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getIncidentById(
    authenticatedUser: User,
    incidentId: number,
  ): Promise<ApiResponse> {
    try {
      const incident = await this.incidentRepo.findOne({
        where: { id: incidentId },
        relations: { approvedBy: true, createdBy: true },
      });
      if (incident) return Response.success(incident);
      return Response.failure(Messages.IncidentNotAvailable);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteIncident(
    authenticatedUser: User,
    incidentId: number,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.SITEENGINEER &&
        authenticatedUser.role != UserRole.ACCOUNTANT &&
        authenticatedUser.role != UserRole.LEADENGINEER
      )
        return Response.failure(Messages.NoPermission);

      await this.incidentRepo.delete(incidentId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllIncidents(
    authenticatedUser: User,
    page: number,
    limit: number,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const query = {} as any;

      if (filter.status) query.status = filter.status;
      if (filter.userId) query.createdById = filter.userId;
      if (
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.ACCOUNTANT &&
        authenticatedUser.role != UserRole.MANAGER
      ) {
        query.createdById = authenticatedUser.id;
      }

      const [result, count] = await this.incidentRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        relations: { approvedBy: true, createdBy: true },
        take: size,
        skip: skip * size,
      });

      if (result.length) {
        const totalPages = Math.round(count / size);
        const analytic = {
          pendingIncidents: await this.incidentRepo.count({
            where: { status: StateStatus.PENDING },
          }),
          declinedIncidents: await this.incidentRepo.count({
            where: { status: StateStatus.DECLINED },
          }),
          approvedIncidents: await this.incidentRepo.count({
            where: { status: StateStatus.APPROVED },
          }),
          settledIncidents: await this.incidentRepo.count({
            where: {
              status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
            },
          }),
        };
        return Response.success({
          analytic,
          page: result,
          size: size,
          currentPage: Number(skip),
          totalPages:
            totalPages > 0
              ? totalPages
              : count > 0 && result.length > 0
                ? 1
                : 0,
        });
      }
      return Response.failure(Messages.NoIncidentFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchIncidents(
    authenticatedUser: User,
    page: number,
    limit: number,
    searchString: string,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const query = [] as any;

      if (
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.ACCOUNTANT &&
        authenticatedUser.role != UserRole.MANAGER
      ) {
        if (searchString) {
          query.push({
            title: Like(`%${searchString}%`),
            createdById: authenticatedUser.id,
          });
          query.push({
            description: Like(`%${searchString}%`),
            createdById: authenticatedUser.id,
          });
          query.push({
            status: Like(`%${searchString}%`),
            createdById: authenticatedUser.id,
          });
        }
      } else {
        if (searchString) {
          query.push({ title: Like(`%${searchString}%`) });
          query.push({ description: Like(`%${searchString}%`) });
          query.push({
            status: Like(`%${searchString}%`),
          });
        }
      }

      const [result, count] = await this.incidentRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        relations: { approvedBy: true, createdBy: true },
        take: size,
        skip: skip * size,
      });

      if (result.length) {
        const totalPages = Math.round(count / size);
        return Response.success({
          page: result,
          size: size,
          currentPage: Number(skip),
          totalPages:
            totalPages > 0
              ? totalPages
              : count > 0 && result.length > 0
                ? 1
                : 0,
        });
      }
      return Response.failure(Messages.NoIncidentFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
