import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import { DebtType, StateStatus, UserRole } from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import { DebtPaymentDto } from 'src/dtos/accounting/debt.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { DebtPayment } from 'src/schemas/accounting/debt-payment.schema';
import { Debt } from 'src/schemas/accounting/debt.schema';

@Injectable()
export class DebtPaymentService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Debt) private debtRepo: Repository<Debt>,
    @InjectRepository(DebtPayment)
    private debtPaymentRepo: Repository<DebtPayment>,
    private readonly queueProducerService: ProducerService,
  ) {}

  async addDebtPayment(
    authenticatedUser: User,
    debtId: number,
    requestDto: DebtPaymentDto,
  ): Promise<ApiResponse> {
    try {
      const debt = await this.debtRepo.findOne({
        where: { id: debtId },
      });
      if (!debt) return Response.failure(Messages.DebtNotAvailable);

      if (requestDto.amount >= debt.outstandingAmount) {
        debt.outstandingAmount = 0;
        debt.status = StateStatus.PAID;
      } else {
        debt.outstandingAmount = debt.outstandingAmount - requestDto.amount;
      }

      const request = {
        ...requestDto,
        debtId: debtId,
        debtType: debt.type,
        createdById: authenticatedUser.id,
      } as unknown as DebtPayment;

      const created = await this.debtPaymentRepo.save(request);
      if (created) {
        await this.debtRepo.save(debt);

        return Response.success(created);
      } else {
        return Response.failure('Unable to add debt payment');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteDebtPayment(
    debtPaymentId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const debtPayment = await this.debtPaymentRepo.findOne({
        where: { id: debtPaymentId },
      });
      if (!debtPayment)
        return Response.failure(Messages.DebtPaymentNotAvailable);

      const debt = await this.debtRepo.findOne({
        where: { id: debtPayment.debtId },
      });
      if (!debt) return Response.failure(Messages.DebtNotAvailable);

      debt.outstandingAmount = debt.outstandingAmount + debtPayment.amount;
      if (debt.outstandingAmount != 0) {
        debt.status = StateStatus.UNPAID;
      }
      await this.debtPaymentRepo.delete(debtPaymentId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllDebtPayments(
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

      const [result, count] = await this.debtPaymentRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true, debt: true },
      });

      if (result.length) {
        const totalPages = Math.round(count / size);
        const analytic = {
          total: await this.debtPaymentRepo.sum('amount', {}),
          totalPaid: await this.debtPaymentRepo.sum('amount', {
            debtType: DebtType.Payable,
            ...query,
          }),
          totalRecovered: await this.debtPaymentRepo.sum('amount', {
            debtType: DebtType.Receivable,
            ...query,
          }),
          pendingRecovery: await this.debtRepo.sum('outstandingAmount', {
            type: DebtType.Receivable,
            ...query,
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
      return Response.failure(Messages.NoDebtPaymentFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchDebtPayments(
    authenticatedUser: User,
    page: number,
    limit: number,
    searchString: string,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      var query = [] as any;

      if (filter.status) {
        query = [
          { description: Like(`%${searchString}%`), status: filter.status },
          { amount: Like(`%${searchString}%`), status: filter.status },
        ];
      }

      if (searchString && query.length <= 0) {
        query.push({ description: Like(`%${searchString}%`) });
        query.push({ amount: Like(`%${searchString}%`) });
      }

      const [result, count] = await this.debtPaymentRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true, debt: true },
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
      return Response.failure(Messages.NoDebtPaymentFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
