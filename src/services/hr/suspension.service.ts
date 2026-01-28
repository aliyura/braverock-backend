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
import { Suspension } from 'src/schemas/hr/suspension.schema';
import { SuspensionDto, UpdateSuspensionDto } from 'src/dtos/hr/suspension.dto';
import { NotificationDto } from 'src/dtos/notification.dto';
import { ProducerService } from 'src/queue/producer.service';

@Injectable()
export class SuspensionService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(Suspension)
    private suspRepo: Repository<Suspension>,
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
  // 1. CREATE / APPLY SUSPENSION
  // ------------------------------------------------------
  async suspendEmployee(
    authenticatedUser: User,
    dto: SuspensionDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.canManage(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const employee = await this.employeeRepo.findOne({
        where: { id: dto.employeeId },
      });
      if (!employee) return Response.failure(Messages.EmployeeNotFound);

      const created = await this.suspRepo.save({
        ...dto,
        status: StateStatus.ACTIVE,
        updateHistory: [
          {
            actionType: StateStatus.ACTIVE,
            actionDate: new Date(),
            actionBy: authenticatedUser.id,
          },
        ],
        createdById: authenticatedUser.id,
      } as Partial<Suspension>);

      await this.broadcast(
        [employee],
        Messages.SuspensionIssued,
        dto.reason || Messages.SuspensionIssuedBody,
        NotificationCategory.SUSPENDED,
      );

      return Response.success(created);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ------------------------------------------------------
  // 2. UPDATE SUSPENSION
  // ------------------------------------------------------
  async updateSuspension(
    suspensionId: number,
    authenticatedUser: User,
    dto: UpdateSuspensionDto,
  ): Promise<ApiResponse> {
    try {
      const susp = await this.suspRepo.findOne({
        where: { id: suspensionId },
      });
      if (!susp) return Response.failure(Messages.SuspensionNotFound);

      const toUpdate: Suspension = {
        ...susp,
        ...dto,
        updateHistory: [
          ...(susp.updateHistory || []),
          {
            ...dto,
            actionType: StateStatus.UPDATED,
            actionDate: new Date(),
            actionBy: authenticatedUser.id,
          },
        ],
      } as Suspension;

      await this.suspRepo.update({ id: suspensionId }, toUpdate);
      const updated = await this.suspRepo.findOne({
        where: { id: suspensionId },
      });
      return Response.success(updated);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ------------------------------------------------------
  // 3. REVOKE SUSPENSION
  // ------------------------------------------------------
  async revokeSuspension(
    suspensionId: number,
    authenticatedUser: User,
    remarks?: string,
  ): Promise<ApiResponse> {
    try {
      if (!this.canManage(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const susp = await this.suspRepo.findOne({
        where: { id: suspensionId },
        relations: { employee: true },
      });
      if (!susp) return Response.failure(Messages.SuspensionNotFound);

      susp.status = StateStatus.REVOKED;
      susp.updateHistory = [
        ...(susp.updateHistory || []),
        {
          actionType: StateStatus.REVOKED,
          actionDate: new Date(),
          actionBy: authenticatedUser.id,
          remarks: remarks || '',
        },
      ];

      await this.suspRepo.save(susp);

      await this.broadcast(
        [susp.employee],
        Messages.SuspensionRevoked,
        remarks || Messages.SuspensionRevokedBody,
        NotificationCategory.SUSPENSION_REVOKED,
      );

      return Response.success(susp);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ------------------------------------------------------
  // 4. COMPLETE SUSPENSION
  // ------------------------------------------------------
  async completeSuspension(
    suspensionId: number,
    authenticatedUser: User,
    remarks?: string,
  ): Promise<ApiResponse> {
    try {
      if (!this.canManage(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const susp = await this.suspRepo.findOne({
        where: { id: suspensionId },
        relations: { employee: true },
      });
      if (!susp) return Response.failure(Messages.SuspensionNotFound);

      susp.status = StateStatus.COMPLETED;
      susp.updateHistory = [
        ...(susp.updateHistory || []),
        {
          actionType: StateStatus.COMPLETED,
          actionDate: new Date(),
          actionBy: authenticatedUser.id,
          remarks: remarks || '',
        },
      ];

      await this.suspRepo.save(susp);

      await this.broadcast(
        [susp.employee],
        Messages.SuspensionCompleted,
        remarks || Messages.SuspensionCompletedBody,
        NotificationCategory.SUSPENSION_COMPLETED,
      );

      return Response.success(susp);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ------------------------------------------------------
  // 5. DELETE SUSPENSION
  // ------------------------------------------------------
  async deleteSuspension(
    suspensionId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (!this.canManage(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      await this.suspRepo.delete(suspensionId);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ------------------------------------------------------
  // 6. GET SUSPENSION BY ID
  // ------------------------------------------------------
  async getSuspensionById(suspensionId: number): Promise<ApiResponse> {
    try {
      const data = await this.suspRepo.findOne({
        where: { id: suspensionId },
        relations: { employee: true },
      });
      if (!data) return Response.failure(Messages.SuspensionNotFound);
      return Response.success(data);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ------------------------------------------------------
  // 7. LIST / PAGINATED
  // ------------------------------------------------------
  async findAllSuspensions(
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

      if (!this.canManage(authenticatedUser))
        where.createdById = authenticatedUser.id;

      const [result, count] = await this.suspRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { employee: true },
      });

      if (!result.length) return Response.failure(Messages.NoSuspensionFound);

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
  // 8. SEARCH SUSPENSIONS
  // ------------------------------------------------------
  async searchSuspensions(
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

      const target = ['reason', 'status'];

      const where = Helpers.buildSearchQuery(
        searchString,
        target,
        filter,
        requiredFilter,
      );

      const [result, count] = await this.suspRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { employee: true },
      });

      if (!result.length) return Response.failure(Messages.NoSuspensionFound);

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
  async exportSuspensionsCsv(filter: FilterDto): Promise<ApiResponse> {
    try {
      const where = Helpers.buildFilteredQuery(filter);

      const rows = await this.suspRepo.find({
        where,
        order: { createdAt: 'DESC' },
        relations: { employee: true },
      });

      const headers = [
        'id',
        'employeeId',
        'employeeName',
        'startDate',
        'endDate',
        'status',
        'reason',
        'createdAt',
      ];

      const csv = [
        headers.join(','),
        ...rows.map((s) =>
          [
            s.id,
            s.employeeId,
            s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : '',
            s.startDate ? new Date(s.startDate).toISOString().slice(0, 10) : '',
            s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : '',
            s.status || '',
            (s.reason || '').replace(/[\r\n,]+/g, ' '),
            s.createdAt?.toISOString() || '',
          ].join(','),
        ),
      ].join('\n');

      return Response.success({
        fileName: `suspensions_${Date.now()}.csv`,
        mimeType: 'text/csv',
        content: csv,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.UnableToExportSuspensions);
    }
  }
}
