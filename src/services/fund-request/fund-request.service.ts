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
import { FundRequest } from 'src/schemas/accounting/fund-request.schema';
import { NotificationDto } from 'src/dtos/notification.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { UpdateStatusDto } from 'src/dtos/master';
import {
  FundRequestDto,
  UpdateFundRequestDto,
} from 'src/dtos/accounting/fund-request.dto';
import { AccountTransaction } from 'src/schemas/accounting/account-transaction.schema';
import { AccountService } from '../account/account.service';
import { Account } from 'src/schemas/accounting/account.schema';

@Injectable()
export class FundRequestService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(FundRequest)
    private fundRequestRepo: Repository<FundRequest>,
    @InjectRepository(Account)
    private accountRepo: Repository<Account>,
    private readonly queueProducerService: ProducerService,
    private readonly accountService: AccountService,
  ) {}

  async addFundRequest(
    authenticatedUser: User,
    requestDto: FundRequestDto,
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
      } as unknown as FundRequest;

      const savedFundRequest = await this.fundRequestRepo.save(request);
      if (savedFundRequest) {
        return Response.success(savedFundRequest);
      } else {
        return Response.failure('Unable to add fundRequest');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateFundRequest(
    fundRequestId: number,
    authenticatedUser: User,
    requestDto: UpdateFundRequestDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role == UserRole.CLIENT ||
        authenticatedUser.role == UserRole.AGENT
      )
        return Response.failure(Messages.NoPermission);

      const fundRequest = await this.fundRequestRepo.findOne({
        where: { id: fundRequestId },
      });
      if (!fundRequest)
        return Response.failure(Messages.FundRequestNotAvailable);

      const updateRequest = {
        ...fundRequest,
        ...requestDto,
      } as FundRequest;

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

      await this.fundRequestRepo.update({ id: fundRequestId }, updateRequest);
      const updatedUser = await this.fundRequestRepo.findOne({
        where: { id: fundRequestId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async changeFundRequestStatus(
    authenticatedUser: User,
    fundRequestId: number,
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

      const fundRequest = await this.fundRequestRepo.findOne({
        where: { id: fundRequestId },
        relations: { createdBy: true },
      });

      let statusText = 'Your fundRequest status has been changed';
      let subject = 'FundRequest Status Change';

      if (requestDto.status == StateStatus.APPROVED) {
        const account = await this.accountRepo.findOne({
          where: { userId: fundRequest.createdById },
        });
        if (!account) return Response.failure(Messages.AccountNotFound);

        const approvedAmount = requestDto.amount || fundRequest.amount;
        fundRequest.approvedAmount = approvedAmount;
        fundRequest.status = requestDto.status;
        fundRequest.approvedById = authenticatedUser.id;
        fundRequest.approvedDate = new Date();

        account.balance = Number(account.balance) + approvedAmount;
        this.accountRepo.save(account);

        const payableRequest = {
          accountId: account.id,
          amount: approvedAmount,
          status: StateStatus.APPROVED,
          type: TransactionType.CREDIT,
          targetType: TargetType.FUNDREQUEST,
          fundRequestId: fundRequest.id,
          reason: fundRequest.title,
          userId: fundRequest.createdById,
          createdById: authenticatedUser.id,
        } as unknown as AccountTransaction;

        await this.accountService.addPayable(authenticatedUser, payableRequest);

        statusText = 'Your fundRequest has been approved';
        subject = 'FundRequest Approved';
      } else if (requestDto.status == StateStatus.DECLINED) {
        fundRequest.status = requestDto.status;
        fundRequest.approvedById = authenticatedUser.id;
        fundRequest.rejectedDate = new Date();
        statusText = 'Your fundRequest has been rejected';
        subject = 'FundRequest Rejected';
      } else {
        return Response.failure(Messages.InvalidStatus);
      }
      await this.fundRequestRepo.save(fundRequest);

      const fundRequestOwner = fundRequest.createdBy as User;
      const statusChangeRemark = `
         ${statusText}\n 
         Additional details:\n
         ${requestDto.statusReason}\n
      `;

      const notification = {
        from: 0,
        to: fundRequestOwner,
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

  async getFundRequestById(
    authenticatedUser: User,
    fundRequestId: number,
  ): Promise<ApiResponse> {
    try {
      const fundRequest = await this.fundRequestRepo.findOne({
        where: { id: fundRequestId },
        relations: { approvedBy: true, createdBy: true },
      });
      if (fundRequest) return Response.success(fundRequest);
      return Response.failure(Messages.FundRequestNotAvailable);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteFundRequest(
    authenticatedUser: User,
    fundRequestId: number,
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

      await this.fundRequestRepo.delete(fundRequestId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllFundRequests(
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
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.ACCOUNTANT
      ) {
        query.createdById = authenticatedUser.id;
      }

      const [result, count] = await this.fundRequestRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        relations: { approvedBy: true, createdBy: true },
        take: size,
        skip: skip * size,
      });

      if (result.length) {
        const totalPages = Math.round(count / size);
        const analytic = {
          pendingFundRequests: await this.fundRequestRepo.count({
            where: { status: StateStatus.PENDING },
          }),
          declinedFundRequests: await this.fundRequestRepo.count({
            where: { status: StateStatus.DECLINED },
          }),
          approvedFundRequests: await this.fundRequestRepo.count({
            where: { status: StateStatus.APPROVED },
          }),
          settledFundRequests: await this.fundRequestRepo.count({
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
      return Response.failure(Messages.NoFundRequestFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchFundRequests(
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
            reason: Like(`%${searchString}%`),
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
          query.push({ reason: Like(`%${searchString}%`) });
          query.push({
            status: Like(`%${searchString}%`),
          });
        }
      }

      const [result, count] = await this.fundRequestRepo.findAndCount({
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
      return Response.failure(Messages.NoFundRequestFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
