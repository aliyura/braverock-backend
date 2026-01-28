import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Between, In, Like, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Helpers, Response } from 'src/helpers';
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
import { BillDto, UpdateBillDto } from 'src/dtos/bill.dto';
import { Bill } from 'src/schemas/bill.schema';
import { NotificationDto } from 'src/dtos/notification.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { Estate } from 'src/schemas/property/estate.schema';
import { UpdateStatusDto } from 'src/dtos/master';
import { Account } from 'src/schemas/accounting/account.schema';
import { AccountTransaction } from 'src/schemas/accounting/account-transaction.schema';
import { AccountService } from '../account/account.service';

@Injectable()
export class BillService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Bill) private billRepo: Repository<Bill>,
    @InjectRepository(Estate) private estateRepo: Repository<Estate>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    private readonly queueProducerService: ProducerService,
    private readonly accountService: AccountService,
  ) {}

  async addBill(
    authenticatedUser: User,
    requestDto: BillDto,
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

      const estate = await this.estateRepo.findOne({
        where: { id: requestDto.estateId },
      });
      if (!estate) return Response.failure(Messages.EstateNotFound);

      const total = requestDto.activities.reduce(
        (sum, act) => Number(sum) + Number(act.amount),
        0,
      );
      const request = {
        ...requestDto,
        amount: total,
        balance: total,
        title: `Daily Bill for ${estate.name} on ${Helpers.getDate()}`,
        status:
          authenticatedUser.role == UserRole.LEADENGINEER
            ? StateStatus.APPROVED
            : StateStatus.PENDING,
        approvedAmount:
          authenticatedUser.role == UserRole.LEADENGINEER ? total : 0,
        createdById: authenticatedUser.id,
      } as unknown as Bill;

      const savedBill = await this.billRepo.save(request);
      if (savedBill) {
        const approver = await this.userRepo.findOne({
          where: { id: savedBill.approverId },
        });
        const estate = await this.estateRepo.findOne({
          where: { id: savedBill.estateId },
        });

        const subject = `Bill From ${authenticatedUser.name}`;
        const body = `
          Dear ${approver.name},
          Please find the daily bill and activities done today(${Helpers.getDate()}) at ${
            estate.name
          }
        `;

        const notification = {
          from: 0,
          to: approver,
          subject: subject,
          body: body,
          category: NotificationCategory.STATUSCHANGE,
          date: new Date(),
          enableEmail: true,
          enableSMS: true,
          enableInApp: false,
          priority: NotificationPriority.HIGH,
        } as unknown as NotificationDto;

        this.queueProducerService.publishNotification(notification);

        return Response.success(savedBill);
      } else {
        return Response.failure('Unable to add bill');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateBill(
    billId: number,
    authenticatedUser: User,
    requestDto: UpdateBillDto,
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

      const bill = await this.billRepo.findOne({
        where: { id: billId },
      });
      if (!bill) return Response.failure(Messages.BillNotAvailable);

      const updateRequest = {
        ...bill,
        ...requestDto,
      } as Bill;

      const total = updateRequest.activities.reduce(
        (sum, act) => Number(sum) + Number(act.amount),
        0,
      );
      updateRequest.amount = total;

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

      await this.billRepo.update({ id: billId }, updateRequest);
      const updatedUser = await this.billRepo.findOne({
        where: { id: billId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async changeBillStatus(
    authenticatedUser: User,
    billId: number,
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

      const bill = await this.billRepo.findOne({
        where: { id: billId },
        relations: { createdBy: true },
      });

      let statusText = 'Your bill status has been changed';
      let subject = 'Bill Status Change';

      if (requestDto.status == StateStatus.APPROVED) {
        const account = await this.accountRepo.findOne({
          where: { userId: bill.createdById },
        });
        if (!account) return Response.failure(Messages.AccountNotFound);

        const approvedAmount = Number(requestDto.amount || bill.amount);
        bill.approvedAmount = approvedAmount;
        bill.status = requestDto.status;
        bill.approverId = authenticatedUser.id;
        bill.approvedDate = new Date();

        account.balance = Number(account.balance) + approvedAmount;
        this.accountRepo.save(account);

        const payableRequest = {
          accountId: account.id,
          amount: approvedAmount,
          status: StateStatus.APPROVED,
          type: TransactionType.CREDIT,
          targetType: TargetType.BILL,
          billId: bill.id,
          reason: bill.title,
          userId: bill.createdById,
          createdById: authenticatedUser.id,
        } as unknown as AccountTransaction;
        await this.accountService.addPayable(authenticatedUser, payableRequest);

        statusText = 'Your bill has been approved';
        subject = 'Bill Approved';
      } else if (requestDto.status == StateStatus.REJECTED) {
        bill.status = requestDto.status;
        bill.approverId = authenticatedUser.id;
        bill.rejectedDate = new Date();
        statusText = 'Your bill has been rejected';
        subject = 'Bill Rejected';
      } else {
        return Response.failure(Messages.InvalidStatus);
      }
      await this.billRepo.save(bill);

      const billOwner = bill.createdBy as User;
      const statusChangeRemark = `
         ${statusText}\n 
         Additional details:\n
         ${requestDto.statusReason}\n
      `;

      const notification = {
        from: 0,
        to: billOwner,
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

  async getBillById(
    authenticatedUser: User,
    billId: number,
  ): Promise<ApiResponse> {
    try {
      const bill = await this.billRepo.findOne({
        where: { id: billId },
        relations: { approver: true, estate: true, createdBy: true },
      });
      if (bill) return Response.success(bill);
      return Response.failure(Messages.BillNotAvailable);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteBill(
    authenticatedUser: User,
    billId: number,
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

      await this.billRepo.delete(billId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllBills(
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

      if (filter.from || filter.to) {
        query.createdAt = Between(
          Helpers.formatDate(
            new Date(filter.from ?? Helpers.formatDate(new Date())),
          ),
          Helpers.formatToNextDay(
            new Date(filter.to ?? Helpers.formatDate(new Date())),
          ),
        );
      }
      if (filter.status) query.status = filter.status;
      if (filter.userId) query.createdById = filter.userId;

      if (authenticatedUser.role == UserRole.SITEENGINEER) {
        query.createdById = authenticatedUser.id;
      }
      if (filter.estateId) {
        query.estateId = filter.estateId;
      }

      const [result, count] = await this.billRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        relations: { approver: true, estate: true, createdBy: true },
        take: size,
        skip: skip * size,
      });

      if (result.length) {
        const totalPages = Math.round(count / size);

        const query = {} as any;
        if (authenticatedUser.role == UserRole.SITEENGINEER) {
          query.createdById = authenticatedUser.id;
        }

        const analytic = {
          pendingWorkBills: await this.billRepo.count({
            where: {
              ...query,
              status: StateStatus.PENDING,
            },
          }),
          approvedWorkBills: await this.billRepo.count({
            where: {
              ...query,
              status: StateStatus.APPROVED,
            },
          }),
          canceledWorkBills: await this.billRepo.count({
            where: {
              ...query,
              status: StateStatus.DECLINED,
            },
          }),
          settledWorkBills: await this.billRepo.count({
            where: {
              ...query,
              status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
            },
          }),
          totalWorkBillAmountPending: await this.billRepo.sum('amount', {
            ...query,
            status: StateStatus.PENDING,
          }),

          totalWorkBillAmountApproved: await this.billRepo.sum(
            'approvedAmount',
            {
              ...query,
              status: StateStatus.APPROVED,
            },
          ),
          totalWorkBillAmountSettled: await this.billRepo.sum('paidAmount', {
            ...query,
            status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
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
      return Response.failure(Messages.NoBillFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchBills(
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

      if (authenticatedUser.role == UserRole.SITEENGINEER) {
        if (searchString) {
          query.push({
            title: Like(`%${searchString}%`),
            createdById: authenticatedUser.id,
          });
          query.push({
            activities: Like(`%${searchString}%`),
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
          query.push({ activities: Like(`%${searchString}%`) });
        }
      }

      const [result, count] = await this.billRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        relations: { approver: true, estate: true, createdBy: true },
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
      return Response.failure(Messages.NoBillFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
