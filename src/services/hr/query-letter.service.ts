import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as NodeCache from 'node-cache';
import { Repository } from 'typeorm';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response, Helpers } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { User } from 'src/schemas/user.schema';
import { FilterDto } from 'src/dtos/filter.dto';
import {
  NotificationCategory,
  NotificationPriority,
  StateStatus,
  UserRole,
} from 'src/enums';
import { Employee } from 'src/schemas/hr/employee.schema';
import { QueryLetter } from 'src/schemas/hr/query-letter.schema';
import {
  QueryLetterDto,
  UpdateQueryLetterDto,
} from 'src/dtos/hr/query-letter.dto';
import { NotificationDto } from 'src/dtos/notification.dto';
import { ProducerService } from 'src/queue/producer.service';

@Injectable()
export class QueryLetterService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(QueryLetter)
    private queryRepo: Repository<QueryLetter>,
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
    private producer: ProducerService,
  ) {}

  private canManage(user: User) {
    return (
      user.role === UserRole.SUPERADMIN ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.MANAGER ||
      user.role === UserRole.HR
    );
  }

  private async broadcast<T extends { emailAddress?: string; name?: string }>(
    recipients: T[],
    subject: string,
    body: string,
    category: NotificationCategory,
  ) {
    for (const to of recipients) {
      const notification: NotificationDto = {
        from: 0,
        to,
        subject,
        body,
        category,
        enableEmail: true,
        enableSMS: true,
        enableInApp: false,
        priority: NotificationPriority.MEDIUM,
        skipSave: false,
      } as NotificationDto;

      await this.producer.publishNotification(notification);
    }
  }

  // ------------------------------------------------------
  // 1. SEND / CREATE QUERY LETTER
  // ------------------------------------------------------
  async sendQueryLetter(
    authenticatedUser: User,
    dto: QueryLetterDto,
  ): Promise<ApiResponse> {
    try {
      const employee = await this.employeeRepo.findOne({
        where: { id: dto.employeeId },
      });
      if (!employee) return Response.failure(Messages.EmployeeNotFound);

      const created = await this.queryRepo.save({
        ...dto,
        status: StateStatus.SENT,
        updateHistory: [
          {
            actionType: StateStatus.SENT,
            actionDate: new Date(),
            actionBy: authenticatedUser.id,
          },
        ],
        createdById: authenticatedUser.id,
      } as Partial<QueryLetter>);

      await this.broadcast(
        [employee],
        Messages.QueryLetterIssued,
        dto.message,
        NotificationCategory.QUERY_SENT,
      );

      return Response.success(created);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ------------------------------------------------------
  // 2. UPDATE QUERY LETTER
  // ------------------------------------------------------
  async updateQueryLetter(
    queryId: number,
    authenticatedUser: User,
    dto: UpdateQueryLetterDto,
  ): Promise<ApiResponse> {
    try {
      const query = await this.queryRepo.findOne({ where: { id: queryId } });
      if (!query) return Response.failure(Messages.QueryNotFound);

      const toUpdate: QueryLetter = {
        ...query,
        ...dto,
        updateHistory: [
          ...(query.updateHistory || []),
          {
            ...dto,
            actionType: StateStatus.UPDATED,
            actionDate: new Date(),
            actionBy: authenticatedUser.id,
          },
        ],
      } as QueryLetter;

      await this.queryRepo.update({ id: queryId }, toUpdate);
      const updated = await this.queryRepo.findOne({ where: { id: queryId } });
      return Response.success(updated);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ------------------------------------------------------
  // 3. ACKNOWLEDGE QUERY LETTER
  // ------------------------------------------------------
  async acknowledgeQueryLetter(
    queryId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      const query = await this.queryRepo.findOne({
        where: { id: queryId },
        relations: { employee: true },
      });
      if (!query) return Response.failure(Messages.QueryNotFound);

      query.status = StateStatus.ACKNOWLEDGED;
      query.updateHistory = [
        ...(query.updateHistory || []),
        {
          actionType: StateStatus.ACKNOWLEDGED,
          actionDate: new Date(),
          actionBy: authenticatedUser.id,
        },
      ];

      await this.queryRepo.save(query);

      await this.broadcast(
        [query.employee],
        Messages.QueryLetterAcknowledged,
        Messages.QueryLetterAcknowledgedBody,
        NotificationCategory.QUERY_ACKNOWLEDGED,
      );

      return Response.success(query);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ------------------------------------------------------
  // 4. REVOKE QUERY LETTER
  // ------------------------------------------------------
  async revokeQueryLetter(
    queryId: number,
    authenticatedUser: User,
    remarks?: string,
  ): Promise<ApiResponse> {
    try {
      if (!this.canManage(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const query = await this.queryRepo.findOne({
        where: { id: queryId },
        relations: { employee: true },
      });
      if (!query) return Response.failure(Messages.QueryNotFound);

      query.status = StateStatus.REVOKED;
      query.updateHistory = [
        ...(query.updateHistory || []),
        {
          actionType: StateStatus.REVOKED,
          actionDate: new Date(),
          actionBy: authenticatedUser.id,
          remarks: remarks || '',
        },
      ];

      await this.queryRepo.save(query);

      await this.broadcast(
        [query.employee],
        Messages.QueryLetterRevokedBody,
        remarks || Messages.QueryLetterRevokedBody,
        NotificationCategory.QUERY_REVOKED,
      );

      return Response.success(query);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ------------------------------------------------------
  // 5. DELETE QUERY LETTER
  // ------------------------------------------------------
  async deleteQueryLetter(
    queryId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (!this.canManage(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      await this.queryRepo.delete(queryId);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ------------------------------------------------------
  // 6. GET QUERY LETTER BY ID
  // ------------------------------------------------------
  async getQueryLetterById(queryId: number): Promise<ApiResponse> {
    try {
      const data = await this.queryRepo.findOne({
        where: { id: queryId },
        relations: { employee: true },
      });
      if (!data) return Response.failure(Messages.QueryNotFound);
      return Response.success(data);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ------------------------------------------------------
  // 7. LIST / PAGINATED
  // ------------------------------------------------------
  async findAllQueryLetters(
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

      const where = Helpers.buildFilteredQuery(filter);

      // Limit access for non-admins
      if (!this.canManage(authenticatedUser))
        where.createdById = authenticatedUser.id;

      const [result, count] = await this.queryRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { employee: true },
      });

      if (!result.length) return Response.failure(Messages.NoQueryFound);

      const totalPages = Math.ceil(count / size);
      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages,
      });
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ------------------------------------------------------
  // 8. SEARCH QUERY LETTERS
  // ------------------------------------------------------
  async searchQueryLetters(
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

      const requiredFilter: any = {};
      if (filter.createdById) requiredFilter.createdById = filter.createdById;

      if (!this.canManage(authenticatedUser))
        requiredFilter.createdById = authenticatedUser.id;

      const target = ['subject', 'message', 'status'];

      const where = Helpers.buildSearchQuery(
        searchString,
        target,
        filter,
        requiredFilter,
      );

      const [result, count] = await this.queryRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { employee: true },
      });

      if (!result.length) return Response.failure(Messages.NoQueryFound);

      const totalPages = Math.ceil(count / size);

      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages,
      });
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ------------------------------------------------------
  // 9. EXPORT CSV
  // ------------------------------------------------------
  async exportQueryLettersCsv(filter: FilterDto): Promise<ApiResponse> {
    try {
      const where = Helpers.buildFilteredQuery(filter);

      const rows = await this.queryRepo.find({
        where,
        order: { createdAt: 'DESC' },
        relations: { employee: true },
      });

      const headers = [
        'id',
        'employeeId',
        'employeeName',
        'subject',
        'status',
        'createdAt',
      ];

      const csv = [
        headers.join(','),
        ...rows.map((q) =>
          [
            q.id,
            q.employeeId,
            q.employee ? `${q.employee.firstName} ${q.employee.lastName}` : '',
            q.subject || '',
            q.status || '',
            q.createdAt?.toISOString() || '',
          ].join(','),
        ),
      ].join('\n');

      return Response.success({
        fileName: `query_letters_${Date.now()}.csv`,
        mimeType: 'text/csv',
        content: csv,
      });
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.UnableToExportQueries);
    }
  }
}
