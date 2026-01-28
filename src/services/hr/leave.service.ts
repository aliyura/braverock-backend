import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as NodeCache from 'node-cache';
import { Repository } from 'typeorm';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response, Helpers } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { User } from 'src/schemas/user.schema';
import { FilterDto } from 'src/dtos/filter.dto';
import { StateStatus, UserRole } from 'src/enums';
import { Leave } from 'src/schemas/hr/leave.schema';
import { Employee } from 'src/schemas/hr/employee.schema';
import { LeaveDto, UpdateLeaveDto } from 'src/dtos/hr/leave.dto';

@Injectable()
export class LeaveService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(Leave) private leaveRepo: Repository<Leave>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
  ) {}

  private canApprove(user: User) {
    return (
      user.role === UserRole.SUPERADMIN ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.MANAGER ||
      user.role === UserRole.HR
    );
  }

  async applyLeave(
    authenticatedUser: User,
    dto: LeaveDto,
  ): Promise<ApiResponse> {
    try {
      const employee = await this.employeeRepo.findOne({
        where: { id: dto.employeeId },
      });
      if (!employee) return Response.failure('EmployeeNotFound');

      const totalDays =
        (new Date(dto.endDate).getTime() - new Date(dto.startDate).getTime()) /
          (1000 * 60 * 60 * 24) +
        1;

      const created = await this.leaveRepo.save({
        ...dto,
        totalDays,
        approvalStatus: 'PENDING',
        status: StateStatus.ACTIVE,
      } as Partial<Leave>);

      return Response.success(created);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async approveLeave(
    leaveId: number,
    approver: User,
    approve: boolean,
    remarks?: string,
  ): Promise<ApiResponse> {
    try {
      if (!this.canApprove(approver))
        return Response.failure(Messages.NoPermission);

      const leave = await this.leaveRepo.findOne({ where: { id: leaveId } });
      if (!leave) return Response.failure('LeaveNotFound');

      leave.approvalStatus = approve ? 'APPROVED' : 'REJECTED';
      leave.approvedById = approver.id;
      leave.updateHistory = [
        ...(leave.updateHistory || []),
        {
          actionType: approve ? 'APPROVE' : 'REJECT',
          actionDate: new Date(),
          actionBy: approver.id,
          remarks: remarks || '',
        },
      ];
      await this.leaveRepo.save(leave);

      return Response.success(leave);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateLeave(
    leaveId: number,
    authenticatedUser: User,
    dto: UpdateLeaveDto,
  ): Promise<ApiResponse> {
    try {
      const leave = await this.leaveRepo.findOne({ where: { id: leaveId } });
      if (!leave) return Response.failure(Messages.LeaveNotFound);

      const toUpdate: Leave = {
        ...leave,
        ...dto,
        updateHistory: [
          ...(leave.updateHistory || []),
          {
            ...dto,
            actionType: 'UPDATE',
            actionDate: new Date(),
            actionBy: authenticatedUser.id,
          },
        ],
      } as Leave;

      await this.leaveRepo.update({ id: leaveId }, toUpdate);
      const updated = await this.leaveRepo.findOne({ where: { id: leaveId } });
      return Response.success(updated);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteLeave(
    leaveId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (!this.canApprove(authenticatedUser))
        return Response.failure(Messages.NoPermission);
      await this.leaveRepo.delete(leaveId);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getLeaveById(leaveId: number): Promise<ApiResponse> {
    try {
      const data = await this.leaveRepo.findOne({
        where: { id: leaveId },
        relations: { employee: true },
      });
      if (!data) return Response.failure(Messages.LeaveNotFound);
      return Response.success(data);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllLeaves(
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

      const [result, count] = await this.leaveRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { employee: true },
      });

      if (!result.length) return Response.failure(Messages.NoLeaveFound);

      const totalPages = Math.round(count / size) || (count > 0 ? 1 : 0);
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

  async searchLeaves(
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

      const target = ['leaveType', 'approvalStatus', 'reason'];
      const where = Helpers.buildSearchQuery(searchString, target, filter);

      const [result, count] = await this.leaveRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { employee: true },
      });

      if (!result.length) return Response.failure(Messages.NoLeaveFound);

      const totalPages = Math.round(count / size) || (count > 0 ? 1 : 0);
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

  async getLeaveBalance(
    employeeId: number,
    year?: number,
  ): Promise<ApiResponse> {
    try {
      const where: any = { employeeId, approvalStatus: 'APPROVED' };
      if (year) {
        // handled in controller/service query level if needed
      }
      const approved = await this.leaveRepo.find({ where });

      // Simple balance (you can plug in a policy engine later)
      const totalApprovedDays = approved.reduce(
        (sum, l) => sum + (l.totalDays || 0),
        0,
      );
      return Response.success({
        employeeId,
        totalApprovedDays,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Unable to compute balance');
    }
  }

  // -------- CSV EXPORT (LEAVES) --------
  async exportLeavesCsv(filter: FilterDto): Promise<ApiResponse> {
    try {
      const where = Helpers.buildFilteredQuery(filter);
      const rows = await this.leaveRepo.find({
        where,
        order: { createdAt: 'DESC' },
        relations: { employee: true },
      });

      const headers = [
        'id',
        'employeeId',
        'employeeName',
        'leaveType',
        'startDate',
        'endDate',
        'totalDays',
        'approvalStatus',
        'reason',
        'createdAt',
      ];

      const csv = [
        headers.join(','),
        ...rows.map((l) =>
          [
            l.id,
            l.employeeId,
            l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : '',
            l.leaveType,
            l.startDate ? new Date(l.startDate).toISOString().slice(0, 10) : '',
            l.endDate ? new Date(l.endDate).toISOString().slice(0, 10) : '',
            l.totalDays || 0,
            l.approvalStatus,
            (l.reason || '').replace(/[\r\n,]+/g, ' '),
            l.createdAt?.toISOString() || '',
          ].join(','),
        ),
      ].join('\n');

      return Response.success({
        fileName: `leaves_${Date.now()}.csv`,
        mimeType: 'text/csv',
        content: csv,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Unable to export leaves');
    }
  }
}
