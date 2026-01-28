import { Expense } from '../../schemas/accounting/expense.schema';
import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import {
  Between,
  LessThan,
  Like,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Helpers, Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import { ActionType, StateStatus, UserRole } from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import { ExpenseDto, UpdateExpenseDto } from 'src/dtos/accounting/expense.dto';
import { FilterDto } from 'src/dtos/filter.dto';

@Injectable()
export class ExpenseService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly queueProducerService: ProducerService,
  ) {}

  async addExpense(
    authenticatedUser: User,
    requestDto: ExpenseDto,
  ): Promise<ApiResponse> {
    try {
      const request = {
        ...requestDto,
        date: new Date(requestDto.date),
        createdById: authenticatedUser.id,
      } as unknown as Expense;

      const created = await this.expenseRepo.save(request);
      if (created) {
        return Response.success(created);
      } else {
        return Response.failure('Unable to add expense');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateExpense(
    expenseId: number,
    authenticatedUser: User,
    requestDto: UpdateExpenseDto,
  ): Promise<ApiResponse> {
    try {
      const expense = await this.expenseRepo.findOne({
        where: { id: expenseId },
      });
      if (!expense) return Response.failure(Messages.ExpenseNotAvailable);

      const updateRequest = {
        ...expense,
        ...requestDto,
      } as Expense;

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

      await this.expenseRepo.update({ id: expenseId }, updateRequest);
      const updatedUser = await this.expenseRepo.findOne({
        where: { id: expenseId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteExpense(
    expenseId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      await this.expenseRepo.delete(expenseId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllExpenses(
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

      if (filterDto.status) query.status = filterDto.status;

      const [result, count] = await this.expenseRepo.findAndCount({
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

        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        startOfYear.setHours(0, 0, 0, 0);

        const analytic = {
          totalAmount: (await this.expenseRepo.sum('amount', query)) ?? 0,
          totalToday:
            (await this.expenseRepo.sum('amount', {
              ...query,
              createdAt: MoreThanOrEqual(todayStart),
            })) ?? 0,
          totalThisMonth:
            (await this.expenseRepo.sum('amount', {
              ...query,
              createdAt: MoreThanOrEqual(startOfMonth),
            })) ?? 0,
          totalThisYear:
            (await this.expenseRepo.sum('amount', {
              ...query,
              createdAt: MoreThanOrEqual(startOfYear),
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
      return Response.failure(Messages.NoExpenseFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchExpenses(
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
          { title: Like(`%${searchString}%`), category: filterDto.category },
          {
            description: Like(`%${searchString}%`),
            category: filterDto.category,
          },
          { amount: Like(`%${searchString}%`), category: filterDto.category },
          { category: filterDto.category },
        ];
      }
      if (filterDto.status) {
        query = [
          { title: Like(`%${searchString}%`), status: filterDto.status },
          { description: Like(`%${searchString}%`), status: filterDto.status },
          { amount: Like(`%${searchString}%`), status: filterDto.status },
          { category: Like(`%${searchString}%`), status: filterDto.status },
        ];
      }

      if (searchString && query.length <= 0) {
        query.push({ title: Like(`%${searchString}%`) });
        query.push({ description: Like(`%${searchString}%`) });
        query.push({ amount: Like(`%${searchString}%`) });
        query.push({ category: Like(`%${searchString}%`) });
      }

      const [result, count] = await this.expenseRepo.findAndCount({
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
      return Response.failure(Messages.NoExpenseFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
