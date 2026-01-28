import { Account } from '../../schemas/accounting/account.schema';
import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import {
  Between,
  In,
  IsNull,
  Like,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Helpers, Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import {
  Currency,
  StateStatus,
  TargetType,
  TransactionType,
  UserRole,
} from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import { FilterDto } from 'src/dtos/filter.dto';
import { AccountTransaction } from 'src/schemas/accounting/account-transaction.schema';
import { AddPaymentDto, UpdateAccountDto } from 'src/dtos/accounting/account.dto';
import { Bill } from 'src/schemas/bill.schema';
import { Incident } from 'src/schemas/incident.schema';
import { FundRequest } from 'src/schemas/accounting/fund-request.schema';
import { Payable } from 'src/schemas/payable.schema';

@Injectable()
export class AccountService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    @InjectRepository(Bill) private billRepo: Repository<Bill>,
    @InjectRepository(Incident) private incidentRepo: Repository<Incident>,
    @InjectRepository(Payable) private payableRepo: Repository<Payable>,
    @InjectRepository(FundRequest)
    private fundRequestRepo: Repository<FundRequest>,
    @InjectRepository(AccountTransaction)
    private accountTransactionRepo: Repository<AccountTransaction>,
    private readonly queueProducerService: ProducerService,
  ) {}

  async refreshAccounts(authenticatedUser: User): Promise<ApiResponse> {
    try {
      //

      //Create accounts for users that doesnt have it

      // const users = await this.userRepo.find({});
      // for (var i = 0; i < users.length; i++) {
      //   const user = users[i] as User;
      //   const existingAccount = await this.accountRepo.findOne({
      //     where: {
      //       userId: users[i].id,
      //     },
      //   });
      //   if (!existingAccount) {
      //     console.log('user:', user);

      //     const bills = await this.billRepo.find({
      //       where: {
      //         createdById: user.id,
      //       },
      //     });
      //     let total = 0;
      //     for (var j = 0; j < bills.length; j++) {
      //       total += Number(bills[j].amount);
      //     }

      //     // Create account
      //     const accountOpeningRequest = {
      //       balance: total,
      //       currency: Currency.NGN,
      //       description: `Account opened by ${authenticatedUser.name} on ${new Date().toISOString()}`,
      //       accountName: null,
      //       accountNumber: null,
      //       bankName: null,
      //       userId: user.id,
      //     } as Account;

      //     const openedAccount = await this.accountRepo.save(
      //       accountOpeningRequest,
      //     );
      //     if (openedAccount) {
      //       user.accountId = openedAccount.id;
      //       await this.userRepo.save(user);
      //     }
      //   }
      // }

      ///
      // const bills = await this.billRepo.find({
      //   where: {
      //     status: StateStatus.APPROVED,
      //   },
      // });
      // for (var i = 0; i < bills.length; i++) {
      //   let bill = bills[i];

      //   const user = await this.userRepo.findOne({
      //     where: { id: bill.createdById },
      //   });

      //   console.log('Recording payables');

      //   const payableRequest = {
      //     accountId: user.accountId,
      //     amount: Number(bill.amount),
      //     status: StateStatus.APPROVED,
      //     type: TransactionType.CREDIT,
      //     targetType: TargetType.BILL,
      //     billId: bill.id,
      //     reason: bill.title,
      //     userId: bill.createdById,
      //     createdById: authenticatedUser.id,
      //   } as unknown as AccountTransaction;
      //   console.log('payableRequest:', payableRequest);
      //   await this.addPayable(authenticatedUser, payableRequest);
      // }
      return Response.success('Accounts refreshed');
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async addPayable(
    authenticatedUser: User,
    payableRequest: AccountTransaction,
  ): Promise<ApiResponse> {
    try {
      const request = {
        amount: payableRequest.amount,
        status: StateStatus.PENDING,
        itemType: payableRequest.targetType,
        itemId:
          payableRequest.billId ||
          payableRequest.incidentId ||
          payableRequest.fundRequestId,
        userId: payableRequest.userId,
      } as Payable;
      const created = await this.payableRepo.save(request);
      if (created) {
        return Response.success(created);
      } else {
        return Response.failure('Unable to add payable transaction');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async processPayment(
    authenticatedUser: User,
    requestDto: AddPaymentDto,
  ): Promise<ApiResponse> {
    try {
      if ((requestDto.targetType = TargetType.BILL)) {
        const bill = await this.billRepo.findOne({
          where: { id: requestDto.billId },
        });
        if (!bill) return Response.failure(Messages.BillNotAvailable);

        const user = await this.userRepo.findOne({
          where: { id: bill.createdById },
        });
        if (!user) return Response.failure(Messages.UserNotFound);

        const account = await this.accountRepo.findOne({
          where: { id: user.accountId },
        });
        if (!account) return Response.failure(Messages.AccountNotFound);

        if (Number(account.balance) >= Number(requestDto.paidAmount)) {
          account.balance =
            Number(account.balance) - Number(requestDto.paidAmount);
        } else {
          account.balance = 0;
        }

        const accountTransactionRequest = {
          ...requestDto,
          accountId: user.accountId,
          status:
            requestDto.paidAmount >= bill.approvedAmount
              ? StateStatus.PAID
              : StateStatus.PARTIALLYPAID,
          type: TransactionType.CREDIT,
          reason: bill.title,
          userId: bill.createdById,
          createdById: authenticatedUser.id,
        } as unknown as AccountTransaction;

        bill.paidAmount =
          Number(bill.paidAmount) + Number(requestDto.paidAmount);
        bill.status =
          bill.paidAmount >= bill.approvedAmount
            ? StateStatus.SETTLED
            : StateStatus.PARTIALLYSETTLED;
        bill.balance = Number(bill.approvedAmount) - Number(bill.paidAmount);
        bill.settledById = authenticatedUser.id;
        bill.settledDate = new Date();

        await this.accountTransactionRepo.save(accountTransactionRequest);
        await this.accountRepo.save(account);
        await this.billRepo.save(bill);
        await this.payableRepo.update(
          {
            itemId: bill.id,
            itemType: requestDto.targetType,
            userId: bill.createdById,
          },
          {
            status: bill.status,
            amount: Number(bill.approvedAmount) - requestDto.paidAmount,
          },
        );

        console.log('bill after :', bill);

        return Response.success(accountTransactionRequest);
      } else if ((requestDto.targetType = TargetType.INCIDENT)) {
        const incident = await this.incidentRepo.findOne({
          where: { id: requestDto.incidentId },
        });
        if (!incident) return Response.failure(Messages.IncidentNotFound);

        const user = await this.userRepo.findOne({
          where: { id: incident.createdById },
        });
        if (!user) return Response.failure(Messages.UserNotFound);

        const account = await this.accountRepo.findOne({
          where: { id: user.accountId },
        });
        if (!account) return Response.failure(Messages.AccountNotFound);

        if (Number(account.balance) >= Number(requestDto.paidAmount)) {
          account.balance =
            Number(account.balance) - Number(requestDto.paidAmount);
        } else {
          account.balance = 0;
        }

        const accountTransactionRequest = {
          ...requestDto,
          accountId: user.accountId,
          status:
            requestDto.paidAmount >= incident.approvedAmount
              ? StateStatus.PAID
              : StateStatus.PARTIALLYPAID,
          type: TransactionType.CREDIT,
          reason: incident.title,
          userId: incident.createdById,
          createdById: authenticatedUser.id,
        } as unknown as AccountTransaction;

        incident.paidAmount =
          Number(incident.paidAmount) + Number(requestDto.paidAmount);
        incident.status =
          incident.paidAmount >= incident.approvedAmount
            ? StateStatus.SETTLED
            : StateStatus.PARTIALLYSETTLED;
        incident.balance =
          Number(incident.approvedAmount) - incident.paidAmount;
        incident.settledById = authenticatedUser.id;
        incident.settledDate = new Date();

        await this.accountTransactionRepo.save(accountTransactionRequest);
        await this.accountRepo.save(account);
        await this.incidentRepo.save(incident);
        await this.payableRepo.update(
          {
            itemId: incident.id,
            itemType: requestDto.targetType,
            userId: incident.createdById,
          },
          {
            status: incident.status,
            amount:
              Number(incident.approvedAmount) - Number(requestDto.paidAmount),
          },
        );

        return Response.success(accountTransactionRequest);
      } else if ((requestDto.targetType = TargetType.FUNDREQUEST)) {
        const fundRequest = await this.fundRequestRepo.findOne({
          where: { id: requestDto.fundRequestId },
        });
        if (!fundRequest) return Response.failure(Messages.FundRequestNotFound);

        const user = await this.userRepo.findOne({
          where: { id: fundRequest.createdById },
        });
        if (!user) return Response.failure(Messages.UserNotFound);

        const account = await this.accountRepo.findOne({
          where: { id: user.accountId },
        });
        if (!account) return Response.failure(Messages.AccountNotFound);

        if (account.balance >= Number(requestDto.paidAmount)) {
          account.balance =
            Number(account.balance) - Number(requestDto.paidAmount);
        } else {
          account.balance = 0;
        }

        const accountTransactionRequest = {
          ...requestDto,
          status:
            requestDto.paidAmount >= fundRequest.approvedAmount
              ? StateStatus.PAID
              : StateStatus.PARTIALLYPAID,
          accountId: user.accountId,
          type: TransactionType.CREDIT,
          reason: fundRequest.title,
          userId: fundRequest.createdById,
          createdById: authenticatedUser.id,
        } as unknown as AccountTransaction;

        fundRequest.paidAmount ==
          Number(fundRequest.paidAmount) + Number(requestDto.paidAmount);
        fundRequest.status =
          fundRequest.paidAmount >= fundRequest.approvedAmount
            ? StateStatus.SETTLED
            : StateStatus.PARTIALLYSETTLED;
        fundRequest.balance =
          Number(fundRequest.approvedAmount) - Number(requestDto.paidAmount);
        fundRequest.settledById = authenticatedUser.id;
        fundRequest.settledDate = new Date();

        await this.accountTransactionRepo.save(accountTransactionRequest);
        await this.accountRepo.save(account);
        await this.fundRequestRepo.save(fundRequest);
        await this.payableRepo.update(
          {
            itemId: fundRequest.id,
            itemType: requestDto.targetType,
            userId: fundRequest.createdById,
          },
          {
            status: fundRequest.status,
            amount: Number(fundRequest.approvedAmount) - requestDto.paidAmount,
          },
        );
        return Response.success(accountTransactionRequest);
      } else {
        return Response.failure(Messages.InvalidTarget);
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async addPayment(
    authenticatedUser: User,
    requestDto: AddPaymentDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      //process payment based on target type
      if (
        [TargetType.BILL, TargetType.INCIDENT, TargetType.FUNDREQUEST].includes(
          requestDto.targetType as TargetType,
        )
      ) {
        return await this.processPayment(authenticatedUser, requestDto);
      } else {
        if (!requestDto.userId)
          return Response.failure(Messages.TargetUserRequired);

        const user = await this.userRepo.findOne({
          where: { id: requestDto.userId },
        });
        if (!user) return Response.failure(Messages.UserNotFound);

        const size = Number(process.env.APP_PAGINATION_SIZE) || 20;

        const count = await this.payableRepo.count({
          where: {
            userId: user.id,
            status: In([StateStatus.PENDING, StateStatus.PARTIALLYSETTLED]),
          },
        });

        const paidPayables = [];
        let incommingPaidAmount = requestDto.paidAmount;
        let numberOfPages = Math.round(count / size);
        numberOfPages === 0 ? 1 : numberOfPages;

        for (var page = 0; page < numberOfPages; page++) {
          const payables = await this.payableRepo.find({
            where: {
              userId: user.id,
              status: In([StateStatus.PENDING, StateStatus.PARTIALLYSETTLED]),
            },
            order: { createdAt: 'ASC' },
            take: size,
            skip: page * size,
          });

          //process payables
          for (var i = 0; i < payables.length; i++) {
            const payable = payables[i] as Payable;
            const payableAmount = payable.amount;
            if (incommingPaidAmount > 0) {
              const paymentRequest = {
                paidAmount:
                  payableAmount > incommingPaidAmount
                    ? incommingPaidAmount
                    : payableAmount,
                targetType: payable.itemType,
                userId: payable.userId,
                reason: 'Multi Settlement',
              } as AddPaymentDto;

              if (payable.itemType == TargetType.BILL)
                paymentRequest.billId = payable.itemId;
              if (payable.itemType == TargetType.INCIDENT)
                paymentRequest.incidentId = payable.itemId;
              if (payable.itemType == TargetType.FUNDREQUEST)
                paymentRequest.fundRequestId = payable.itemId;

              const paymentResult = await this.processPayment(
                authenticatedUser,
                paymentRequest,
              );
              if (paymentResult.success) {
                if (payableAmount > incommingPaidAmount) {
                  incommingPaidAmount = incommingPaidAmount - payableAmount;
                } else {
                  incommingPaidAmount = 0;
                }
                //patially update payable status just for ui pupose not for database
                payable.status =
                  incommingPaidAmount >= payable.amount
                    ? StateStatus.SETTLED
                    : StateStatus.PARTIALLYSETTLED;
                paidPayables.push({
                  staus: StateStatus.SUCCESS,
                  message: paymentResult.message,
                  data: payable,
                });
              } else {
                paidPayables.push({
                  staus: StateStatus.FAILED,
                  message: paymentResult.message,
                  data: payable,
                });
              }
            }
          }

          if (incommingPaidAmount <= 0) {
            return Response.success(paidPayables);
          } else {
            if (incommingPaidAmount == requestDto.paidAmount) {
              return Response.failure(paidPayables);
            }
          }
        }
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateAccount(
    authenticatedUser: User,
    accountId: number,
    requestDto: UpdateAccountDto,
  ): Promise<ApiResponse> {
    try {
      const account = await this.accountRepo.findOne({
        where: accountId ? { id: accountId } : { userId: authenticatedUser.id },
      });
      if (account) return Response.failure(Messages.AccountNotFound);

      await this.accountRepo.update(accountId, requestDto);

      return Response.success('Account updated succesfully');
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getAccountBalance(
    authenticatedUser: User,
    accountId: number,
  ): Promise<ApiResponse> {
    try {
      const account = await this.accountRepo.findOne({
        where: accountId ? { id: accountId } : { userId: authenticatedUser.id },
      });
      if (account) return Response.failure(Messages.AccountNotFound);

      return Response.success(account);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAccountTransactions(
    authenticatedUser: User,
    accountId: number,
    page: number,
    limit: number,
    filterDto: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;
      const query = { accountId } as any;

      if (filterDto.from || filterDto.to) {
        query.createdAt = Between(
          Helpers.formatDate(
            new Date(filterDto.from ?? Helpers.formatDate(new Date())),
          ),
          Helpers.formatToNextDay(
            new Date(filterDto.to ?? Helpers.formatDate(new Date())),
          ),
        );
      }
      if (filterDto.type) query.category = filterDto.type;
      if (filterDto.targetType) query.targetType = filterDto.targetType;
      if (filterDto.status) query.status = filterDto.status;

      const [result, count] = await this.accountTransactionRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
      });

      if (result.length) {
        const todayStart = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          new Date().getDate(),
        );
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const analytic = {
          totalDebit:
            (await this.accountTransactionRepo.sum('amount', {
              ...query,
              type: TransactionType.DEBIT,
            })) ?? 0,
          totalCredit:
            (await this.accountTransactionRepo.sum('amount', {
              ...query,
              type: TransactionType.CREDIT,
            })) ?? 0,
          totalAdjustments:
            (await this.accountTransactionRepo.sum('amount', {
              ...query,
              type: TransactionType.ADJUSTMENT,
            })) ?? 0,
          totalCreditToday:
            (await this.accountTransactionRepo.sum('amount', {
              ...query,
              type: TransactionType.CREDIT,
              createdAt: MoreThanOrEqual(todayStart),
            })) ?? 0,
          totalCreditThisMonth:
            (await this.accountTransactionRepo.sum('amount', {
              ...query,
              type: TransactionType.CREDIT,
              createdAt: MoreThanOrEqual(startOfMonth),
            })) ?? 0,
          totalDebitToday:
            (await this.accountTransactionRepo.sum('amount', {
              ...query,
              type: TransactionType.DEBIT,
              createdAt: MoreThanOrEqual(todayStart),
            })) ?? 0,
          totalDebitThisMonth:
            (await this.accountTransactionRepo.sum('amount', {
              ...query,
              type: TransactionType.DEBIT,
              createdAt: MoreThanOrEqual(startOfMonth),
            })) ?? 0,
        };

        const totalPages = Math.round(count / size);
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
      return Response.failure(Messages.NoAccountFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchAccountTransactions(
    authenticatedUser: User,
    accountId: number,
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

      var query = [] as any;

      if (searchString && query.length <= 0) {
        query.push({ accountId, type: Like(`%${searchString}%`) });
        query.push({ accountId, targetType: Like(`%${searchString}%`) });
        query.push({ accountId, reason: Like(`%${searchString}%`) });
        query.push({ accountId, status: Like(`%${searchString}%`) });
      }

      const [result, count] = await this.accountTransactionRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
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
      return Response.failure(Messages.NoAccountFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
