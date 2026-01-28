import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as NodeCache from 'node-cache';
import * as ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import { validate } from 'class-validator';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response, Helpers } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { User } from 'src/schemas/user.schema';
import { FilterDto } from 'src/dtos/filter.dto';
import { StateStatus, UserRole } from 'src/enums';
import { Employee } from 'src/schemas/hr/employee.schema';
import { Attendance } from 'src/schemas/hr/attendance.schema';
import { AttendanceDto, UpdateAttendanceDto } from 'src/dtos/hr/attendance.dto';

@Injectable()
export class AttendanceService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(Attendance)
    private attendanceRepo: Repository<Attendance>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
  ) {}

  private canManage(user: User) {
    return (
      user.role === UserRole.SUPERADMIN ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.MANAGER ||
      user.role === UserRole.HR
    );
  }

  private calculateWorkHours(checkIn: string, checkOut: string): number {
    if (!checkIn || !checkOut) return 0;
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    const diff = (outH * 60 + outM - (inH * 60 + inM)) / 60;
    return diff > 0 ? Number(diff.toFixed(2)) : 0;
  }

  async markAttendance(
    authUser: User,
    dto: AttendanceDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.canManage(authUser))
        return Response.failure(Messages.NoPermission);

      const emp = await this.employeeRepo.findOne({
        where: { id: dto.employeeId },
      });
      if (!emp) return Response.failure('EmployeeNotFound');

      const existing = await this.attendanceRepo.findOne({
        where: { employeeId: dto.employeeId, date: dto.date },
      });

      const workHours = this.calculateWorkHours(
        dto.checkInTime,
        dto.checkOutTime,
      );
      const isLate = dto.checkInTime ? dto.checkInTime > '08:30' : false;

      const record: Partial<Attendance> = {
        ...dto,
        workHours,
        isLate,
        isAbsent: false,
        createdById: authUser.id,
        status: StateStatus.ACTIVE,
      };

      if (existing) {
        await this.attendanceRepo.update({ id: existing.id }, record);
        const updated = await this.attendanceRepo.findOne({
          where: { id: existing.id },
        });
        return Response.success(updated);
      }

      const created = await this.attendanceRepo.save(record);
      return Response.success(created);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateAttendance(
    id: number,
    authUser: User,
    dto: UpdateAttendanceDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.canManage(authUser))
        return Response.failure(Messages.NoPermission);

      const att = await this.attendanceRepo.findOne({ where: { id } });
      if (!att) return Response.failure('AttendanceNotFound');

      const updateHistory = {
        ...dto,
        actionType: 'UPDATE',
        actionDate: new Date(),
        actionBy: authUser.id,
      };

      const updated = {
        ...att,
        ...dto,
        updateHistory: [...(att.updateHistory || []), updateHistory],
      };

      await this.attendanceRepo.update({ id }, updated);
      return Response.success(
        await this.attendanceRepo.findOne({ where: { id } }),
      );
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  async markAbsent(
    employeeId: number,
    date: Date,
    createdBy: User,
  ): Promise<ApiResponse> {
    try {
      const existing = await this.attendanceRepo.findOne({
        where: { employeeId, date },
      });
      if (existing) return Response.failure('AttendanceAlreadyMarked');

      const att = await this.attendanceRepo.save({
        employeeId,
        date,
        isAbsent: true,
        workHours: 0,
        createdById: createdBy.id,
        status: StateStatus.ACTIVE,
      });
      return Response.success(att);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getAttendanceById(id: number): Promise<ApiResponse> {
    try {
      const data = await this.attendanceRepo.findOne({
        where: { id },
        relations: { employee: true, createdBy: true },
      });
      if (!data) return Response.failure('AttendanceNotFound');
      return Response.success(data);
    } catch (ex) {
      return Response.failure(Messages.Exception);
    }
  }

  async findAllAttendance(
    page: number,
    limit: number,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size = limit || 15;
      const skip = page || 0;
      const where = Helpers.buildFilteredQuery(filter);

      const [result, count] = await this.attendanceRepo.findAndCount({
        where,
        order: { date: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { employee: true },
      });

      if (!result.length) return Response.failure('NoAttendanceFound');

      const totalPages = Math.ceil(count / size);
      const analytic = {
        total: count,
        present: await this.attendanceRepo.count({
          where: { isAbsent: false },
        }),
        absent: await this.attendanceRepo.count({ where: { isAbsent: true } }),
        late: await this.attendanceRepo.count({ where: { isLate: true } }),
      };

      return Response.success({
        analytic,
        page: result,
        size,
        currentPage: skip,
        totalPages,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  async bulkUploadAttendance(
    fileBuffer: Buffer,
    authUser: User,
  ): Promise<ApiResponse> {
    try {
      if (!this.canManage(authUser))
        return Response.failure(Messages.NoPermission);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const ws = workbook.worksheets[0];
      const header = ws.getRow(1);
      const headerMap: Record<string, number> = {};
      header.eachCell(
        (c, i) => (headerMap[String(c.value).trim().toLowerCase()] = i),
      );

      const get = (r: ExcelJS.Row, f: string) => {
        const col = headerMap[f.toLowerCase()];
        if (!col) return '';
        const cell = r.getCell(col);
        const val = cell?.value;
        return typeof val === 'object' && 'text' in val ? val.text : val;
      };

      const toCreate: Partial<Attendance>[] = [];
      const errors: any[] = [];

      for (let i = 2; i <= ws.rowCount; i++) {
        const row = ws.getRow(i);
        const emailAddress = String(get(row, 'emailAddress') || '').trim();
        const date = new Date(get(row, 'date').toString());
        const checkInTime = String(get(row, 'checkInTime') || '').trim();
        const checkOutTime = String(get(row, 'checkOutTime') || '').trim();
        const siteName = String(get(row, 'siteName') || '').trim();

        const emp = await this.employeeRepo.findOne({
          where: { emailAddress },
        });
        if (!emp) {
          errors.push({ row: i, emailAddress, error: 'EmployeeNotFound' });
          continue;
        }

        const workHours = this.calculateWorkHours(checkInTime, checkOutTime);
        const isLate = checkInTime > '08:30';

        toCreate.push({
          employeeId: emp.id,
          date,
          checkInTime,
          checkOutTime,
          siteName,
          workHours,
          isLate,
          isAbsent: false,
          createdById: authUser.id,
        });
      }

      const created = await this.attendanceRepo.save(toCreate);
      return Response.success({
        createdCount: created.length,
        failedCount: errors.length,
        failedRows: errors,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Error while uploading attendance');
    }
  }

  async exportAttendanceCsv(filter: FilterDto): Promise<ApiResponse> {
    try {
      const where = Helpers.buildFilteredQuery(filter);
      const rows = await this.attendanceRepo.find({
        where,
        order: { date: 'DESC' },
        relations: { employee: true },
      });

      const headers = [
        'Employee',
        'Date',
        'CheckIn',
        'CheckOut',
        'WorkHours',
        'IsLate',
        'IsAbsent',
        'Site',
        'Remarks',
      ];

      const csv = [
        headers.join(','),
        ...rows.map((a) =>
          [
            `${a.employee?.firstName || ''} ${a.employee?.lastName || ''}`,
            a.date?.toISOString().slice(0, 10),
            a.checkInTime || '',
            a.checkOutTime || '',
            a.workHours,
            a.isLate ? 'Yes' : 'No',
            a.isAbsent ? 'Yes' : 'No',
            a.siteName || '',
            (a.remarks || '').replace(/[\r\n,]+/g, ' '),
          ].join(','),
        ),
      ].join('\n');

      return Response.success({
        fileName: `attendance_${Date.now()}.csv`,
        mimeType: 'text/csv',
        content: csv,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Unable to export attendance');
    }
  }
}
