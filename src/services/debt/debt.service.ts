import { Debt } from '../../schemas/accounting/debt.schema';
import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Between, Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Helpers, Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import { ActionType, DebtType, UserRole } from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import { DebtDto, UpdateDebtDto } from 'src/dtos/accounting/debt.dto';
import { FilterDto } from 'src/dtos/filter.dto';
@Injectable()
export class DebtService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Debt) private debtRepo: Repository<Debt>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly queueProducerService: ProducerService,
  ) {}

  async addDebt(
    authenticatedUser: User,
    requestDto: DebtDto,
  ): Promise<ApiResponse> {
    try {
      const request = {
        ...requestDto,
        repaymentAmount: requestDto.amount,
        outstandingAmount: requestDto.amount,
        dueDate: requestDto.dueDate,
        createdById: authenticatedUser.id,
      } as unknown as Debt;

      const created = await this.debtRepo.save(request);
      if (created) {
        return Response.success(created);
      } else {
        return Response.failure('Unable to add debt');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateDebt(
    debtId: number,
    authenticatedUser: User,
    requestDto: UpdateDebtDto,
  ): Promise<ApiResponse> {
    try {
      const debt = await this.debtRepo.findOne({
        where: { id: debtId },
      });
      if (!debt) return Response.failure(Messages.DebtNotAvailable);

      const updateRequest = {
        ...debt,
        ...requestDto,
      } as Debt;

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

      await this.debtRepo.update({ id: debtId }, updateRequest);
      const updatedUser = await this.debtRepo.findOne({
        where: { id: debtId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteDebt(
    debtId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      await this.debtRepo.delete(debtId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllDebts(
    authenticatedUser: User,
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
      const query = {} as any;

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
      if (filterDto.category) query.category = filterDto.category;

      if (filterDto.type) query.type = filterDto.type;

      if (filterDto.status) query.status = filterDto.status;

      const [result, count] = await this.debtRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
      });

      if (result.length) {
        const analytic = {
          totalPayables: await this.debtRepo.sum('amount', {
            type: DebtType.Payable,
            ...query,
          }),
          totalReceivables: await this.debtRepo.sum('amount', {
            type: DebtType.Receivable,
            ...query,
          }),
          payableOutstanding: await this.debtRepo.sum('outstandingAmount', {
            type: DebtType.Payable,
            ...query,
          }),
          receivableOutstanding: await this.debtRepo.sum('outstandingAmount', {
            type: DebtType.Receivable,
            ...query,
          }),
          totalPaidPayable: await this.debtRepo.sum('paidAmount', {
            type: DebtType.Payable,
            ...query,
          }),
          totalRecovered: await this.debtRepo.sum('paidAmount', {
            type: DebtType.Receivable,
            ...query,
          }),
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
      return Response.failure(Messages.NoDebtFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchDebts(
    authenticatedUser: User,
    page: number,
    limit: number,
    searchString: string,
    filterDto: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      var query = [] as any;

      if (filterDto.category) {
        query = [
          { name: Like(`%${searchString}%`), category: filterDto.category },
          {
            description: Like(`%${searchString}%`),
            category: filterDto.category,
          },
          { amount: Like(`%${searchString}%`), category: filterDto.category },
          { type: Like(`%${searchString}%`), category: filterDto.category },
          { category: filterDto.category },
        ];
      }

      if (filterDto.type) {
        query = [
          { name: Like(`%${searchString}%`), type: filterDto.type },
          { description: Like(`%${searchString}%`), type: filterDto.type },
          { amount: Like(`%${searchString}%`), type: filterDto.type },
          { category: Like(`%${searchString}%`), type: filterDto.type },
          { type: filterDto.type },
        ];
      }

      if (filterDto.status) {
        query = [
          { name: Like(`%${searchString}%`), status: filterDto.status },
          { description: Like(`%${searchString}%`), status: filterDto.status },
          { amount: Like(`%${searchString}%`), status: filterDto.status },
          { category: Like(`%${searchString}%`), status: filterDto.status },
          { type: Like(`%${searchString}%`), status: filterDto.type },
        ];
      }

      if (searchString && query.length <= 0) {
        query.push({ name: Like(`%${searchString}%`) });
        query.push({ description: Like(`%${searchString}%`) });
        query.push({ amount: Like(`%${searchString}%`) });
        query.push({ category: Like(`%${searchString}%`) });
        query.push({ type: Like(`%${searchString}%`) });
      }

      const [result, count] = await this.debtRepo.findAndCount({
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
      return Response.failure(Messages.NoDebtFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
