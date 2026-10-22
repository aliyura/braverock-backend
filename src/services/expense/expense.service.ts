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
import { Estate } from 'src/schemas/property/estate.schema';
import { Layout } from 'src/schemas/property/layout.schema';
import { ActionType, ExpenseTargetType, StateStatus, UserRole } from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import { ExpenseDto, UpdateExpenseDto } from 'src/dtos/accounting/expense.dto';
import { FilterDto } from 'src/dtos/filter.dto';

@Injectable()
export class ExpenseService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Estate) private estateRepo: Repository<Estate>,
    @InjectRepository(Layout) private layoutRepo: Repository<Layout>,
    private readonly queueProducerService: ProducerService,
  ) {}

  async addExpense(
    authenticatedUser: User,
    requestDto: ExpenseDto,
  ): Promise<ApiResponse> {
    try {
      if (!requestDto.receipt || typeof requestDto.receipt !== 'string' || requestDto.receipt.trim() === '') {
        return Response.failure('Expense receipt image is required');
      }

      const targetType = (requestDto.targetType || '').toUpperCase().trim();
      let estateId: number | null = null;
      let layoutId: number | null = null;
      let officePurpose: string | null = null;

      if (targetType === ExpenseTargetType.ESTATE) {
        if (!requestDto.estateId || isNaN(Number(requestDto.estateId))) {
          return Response.failure('Please select the estate that this expense belongs to');
        }
        const estate = await this.estateRepo.findOne({
          where: { id: Number(requestDto.estateId) },
        });
        if (!estate) {
          return Response.failure('Selected estate not found');
        }
        estateId = Number(requestDto.estateId);
      } else if (targetType === ExpenseTargetType.LAYOUT) {
        if (!requestDto.layoutId || isNaN(Number(requestDto.layoutId))) {
          return Response.failure('Please select the layout that this expense belongs to');
        }
        const layout = await this.layoutRepo.findOne({
          where: { id: Number(requestDto.layoutId) },
        });
        if (!layout) {
          return Response.failure('Selected layout not found');
        }
        layoutId = Number(requestDto.layoutId);
      } else if (targetType === ExpenseTargetType.OFFICE) {
        if (
          (!requestDto.officePurpose || requestDto.officePurpose.trim() === '') &&
          (!requestDto.description || requestDto.description.trim() === '')
        ) {
          return Response.failure('Please specify what this office expense is for');
        }
        officePurpose = (requestDto.officePurpose || requestDto.description || '').trim();
      } else {
        return Response.failure('Invalid expense target type. Must be ESTATE, LAYOUT, or OFFICE');
      }

      const request = {
        ...requestDto,
        targetType,
        estateId,
        layoutId,
        officePurpose,
        date: new Date(requestDto.date),
        createdById: authenticatedUser.id,
      } as unknown as Expense;

      const created = await this.expenseRepo.save(request);
      if (created) {
        const finalExpense = await this.expenseRepo.findOne({
          where: { id: created.id },
          relations: { createdBy: true, estate: true, layout: true },
        });
        return Response.success(finalExpense || created);
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
      if (!expenseId || isNaN(Number(expenseId))) {
        return Response.failure(Messages.ExpenseNotAvailable);
      }

      const expense = await this.expenseRepo.findOne({
        where: { id: Number(expenseId) },
      });
      if (!expense) return Response.failure(Messages.ExpenseNotAvailable);

      const targetType =
        requestDto.targetType !== undefined
          ? (requestDto.targetType || '').toUpperCase().trim()
          : expense.targetType;

      let estateId = expense.estateId;
      let layoutId = expense.layoutId;
      let officePurpose = expense.officePurpose;

      if (
        requestDto.targetType !== undefined ||
        requestDto.estateId !== undefined ||
        requestDto.layoutId !== undefined ||
        requestDto.officePurpose !== undefined
      ) {
        if (targetType === ExpenseTargetType.ESTATE) {
          const selectedEstateId =
            requestDto.estateId !== undefined
              ? requestDto.estateId
              : expense.estateId;
          if (!selectedEstateId || isNaN(Number(selectedEstateId))) {
            return Response.failure('Please select the estate that this expense belongs to');
          }
          const estate = await this.estateRepo.findOne({
            where: { id: Number(selectedEstateId) },
          });
          if (!estate) {
            return Response.failure('Selected estate not found');
          }
          estateId = Number(selectedEstateId);
          layoutId = null;
          officePurpose = null;
        } else if (targetType === ExpenseTargetType.LAYOUT) {
          const selectedLayoutId =
            requestDto.layoutId !== undefined
              ? requestDto.layoutId
              : expense.layoutId;
          if (!selectedLayoutId || isNaN(Number(selectedLayoutId))) {
            return Response.failure('Please select the layout that this expense belongs to');
          }
          const layout = await this.layoutRepo.findOne({
            where: { id: Number(selectedLayoutId) },
          });
          if (!layout) {
            return Response.failure('Selected layout not found');
          }
          layoutId = Number(selectedLayoutId);
          estateId = null;
          officePurpose = null;
        } else if (targetType === ExpenseTargetType.OFFICE) {
          const purpose =
            requestDto.officePurpose !== undefined
              ? requestDto.officePurpose
              : expense.officePurpose || requestDto.description || expense.description;
          if (!purpose || purpose.trim() === '') {
            return Response.failure('Please specify what this office expense is for');
          }
          officePurpose = purpose.trim();
          estateId = null;
          layoutId = null;
        } else {
          return Response.failure('Invalid expense target type. Must be ESTATE, LAYOUT, or OFFICE');
        }
      }

      if (requestDto.receipt !== undefined) {
        if (!requestDto.receipt || requestDto.receipt.trim() === '') {
          return Response.failure('Expense receipt image cannot be empty');
        }
      }

      const updateRequest = {
        ...expense,
        ...requestDto,
        targetType,
        estateId,
        layoutId,
        officePurpose,
        date: requestDto.date ? new Date(requestDto.date) : expense.date,
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

      updateRequest.updatedAt = new Date();
      await this.expenseRepo.save(updateRequest);

      const updatedExpense = await this.expenseRepo.findOne({
        where: { id: Number(expenseId) },
        relations: { createdBy: true, estate: true, layout: true },
      });
      return Response.success(updatedExpense || updateRequest);
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
      if (!expenseId || isNaN(Number(expenseId))) {
        return Response.failure(Messages.ExpenseNotAvailable);
      }

      const expense = await this.expenseRepo.findOne({
        where: { id: Number(expenseId) },
      });
      if (!expense) return Response.failure(Messages.ExpenseNotAvailable);

      await this.expenseRepo.delete(Number(expenseId));

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getExpenseById(expenseId: number): Promise<ApiResponse> {
    try {
      if (!expenseId || isNaN(Number(expenseId))) {
        return Response.failure(Messages.ExpenseNotAvailable);
      }

      const expense = await this.expenseRepo.findOne({
        where: { id: Number(expenseId) },
        relations: { createdBy: true, estate: true, layout: true },
      });
      if (expense) {
        return Response.success(expense);
      }
      return Response.failure(Messages.ExpenseNotAvailable);
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
      if (filterDto.targetType) query.targetType = filterDto.targetType;
      if (filterDto.estateId) query.estateId = Number(filterDto.estateId);
      if (filterDto.layoutId) query.layoutId = Number(filterDto.layoutId);

      const [result, count] = await this.expenseRepo.findAndCount({
        where: query,
        relations: { createdBy: true, estate: true, layout: true },
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

      const baseQuery = {} as any;

      if (filterDto.from || filterDto.to) {
        baseQuery.createdAt = Between(
          Helpers.formatDate(
            new Date(filterDto.from ?? Helpers.formatDate(new Date())),
          ),
          Helpers.formatToNextDay(
            new Date(filterDto.to ?? Helpers.formatDate(new Date())),
          ),
        );
      }
      if (filterDto.category) baseQuery.category = filterDto.category;
      if (filterDto.status) baseQuery.status = filterDto.status;
      if (filterDto.targetType) baseQuery.targetType = filterDto.targetType;
      if (filterDto.estateId)
        baseQuery.estateId = Number(filterDto.estateId);
      if (filterDto.layoutId)
        baseQuery.layoutId = Number(filterDto.layoutId);

      const searchFields = [
        'title',
        'description',
        'officePurpose',
        'amount',
        'category',
        'targetType',
      ];
      const query = [] as any;
      if (searchString) {
        for (const field of searchFields) {
          query.push({ ...baseQuery, [field]: Like(`%${searchString}%`) });
        }
      }

      const [result, count] = await this.expenseRepo.findAndCount({
        where: query.length ? query : baseQuery,
        relations: { createdBy: true, estate: true, layout: true },
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
