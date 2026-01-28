import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as NodeCache from 'node-cache';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response, Helpers } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { User } from 'src/schemas/user.schema';
import { FilterDto } from 'src/dtos/filter.dto';
import { StateStatus, UserRole } from 'src/enums';
import { Payroll } from 'src/schemas/hr/payroll.schema';
import { Employee } from 'src/schemas/hr/employee.schema';
import { PayrollDto } from 'src/dtos/hr/payroll.dto';

@Injectable()
export class PayrollService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(Payroll) private payrollRepo: Repository<Payroll>,
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

  private computeNet(base = 0, allowance = 0, deduction = 0) {
    return (
      (Number(base) || 0) + (Number(allowance) || 0) - (Number(deduction) || 0)
    );
  }

  async createOrUpdatePayroll(
    authenticatedUser: User,
    dto: PayrollDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.canManage(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const employee = await this.employeeRepo.findOne({
        where: { id: dto.employeeId },
      });
      if (!employee) return Response.failure(Messages.EmployeeNotFound);

      const existing = await this.payrollRepo.findOne({
        where: { employeeId: dto.employeeId, month: dto.month },
      });

      const baseSalary = dto.baseSalary ?? employee.salary ?? 0;
      const netPay =
        dto.netPay ??
        this.computeNet(baseSalary, dto.allowance || 0, dto.deduction || 0);

      if (existing) {
        const updated = {
          ...existing,
          ...dto,
          baseSalary,
          netPay,
          updateHistory: [
            ...(existing.updateHistory || []),
            {
              actionType: 'UPDATE',
              actionDate: new Date(),
              actionBy: authenticatedUser.id,
            },
          ],
        } as Payroll;
        await this.payrollRepo.update({ id: existing.id }, updated);
        const ref = await this.payrollRepo.findOne({
          where: { id: existing.id },
          relations: { employee: true },
        });
        return Response.success(ref);
      } else {
        const created = await this.payrollRepo.save({
          ...dto,
          baseSalary,
          netPay,
          createdById: authenticatedUser.id,
          status: StateStatus.ACTIVE,
        } as Partial<Payroll>);
        return Response.success(created);
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async markPaid(
    id: number,
    paymentRef: string,
    paymentDate: Date,
  ): Promise<ApiResponse> {
    try {
      const pr = await this.payrollRepo.findOne({ where: { id } });
      if (!pr) return Response.failure(Messages.PayrollNotFound);

      pr.paymentStatus = 'PAID';
      pr.paymentRef = paymentRef;
      pr.paymentDate = paymentDate;
      await this.payrollRepo.save(pr);

      return Response.success(pr);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  async generateForMonth(
    authenticatedUser: User,
    month: string,
  ): Promise<ApiResponse> {
    try {
      if (!this.canManage(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const employees = await this.employeeRepo.find({
        where: { status: StateStatus.ACTIVE } as any,
      });

      const upserts: Partial<Payroll>[] = [];
      for (const emp of employees) {
        const exists = await this.payrollRepo.existsBy({
          employeeId: emp.id,
          month,
        });
        if (exists) continue;

        const baseSalary = emp.salary || 0;
        upserts.push({
          employeeId: emp.id,
          month,
          baseSalary,
          allowance: 0,
          deduction: 0,
          netPay: this.computeNet(baseSalary, 0, 0),
          createdById: authenticatedUser.id,
          status: StateStatus.ACTIVE,
          paymentStatus: 'PENDING',
        } as Partial<Payroll>);
      }

      const created = await this.payrollRepo.save(upserts);
      return Response.success({ created: created.length });
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getPayrollById(id: number): Promise<ApiResponse> {
    try {
      const pr = await this.payrollRepo.findOne({
        where: { id },
        relations: { employee: true, createdBy: true },
      });
      if (!pr) return Response.failure(Messages.PayrollNotFound);
      return Response.success(pr);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllPayrolls(
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

      const [result, count] = await this.payrollRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { employee: true, createdBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoPayrollFound);

      const totalPages = Math.round(count / size) || (count > 0 ? 1 : 0);
      const analytic = {
        total: await this.payrollRepo.count(),
        paid: await this.payrollRepo.count({
          where: { paymentStatus: 'PAID' } as any,
        }),
        pending: await this.payrollRepo.count({
          where: { paymentStatus: 'PENDING' } as any,
        }),
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

  async bulkUploadPayroll(
    fileBuffer: Buffer,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (!this.canManage(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const ws = workbook.worksheets[0];

      const headerRow = ws.getRow(1);
      const headerMap: Record<string, number> = {};
      headerRow.eachCell((cell, col) => {
        if (cell?.value)
          headerMap[String(cell.value).trim().toLowerCase()] = col;
      });

      const get = (row: ExcelJS.Row, field: string) => {
        const col = headerMap[field.toLowerCase()];
        if (!col) return '';
        const cell = row.getCell(col);
        const val = cell?.value;
        if (val == null) return '';
        if (typeof val === 'object') {
          if ('text' in val) return val.text;
          if ('richText' in val)
            return (val as any).richText.map((r) => r.text).join('');
          if ('formula' in val) return (val as any).result;
          return '';
        }
        return val;
      };

      const toUpsert: Partial<Payroll>[] = [];
      const errors: any[] = [];

      for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        if (!row || row.number === 1) continue;

        const emailAddress = String(get(row, 'employeeEmail') || '').trim();
        const month = String(get(row, 'month') || '').trim();
        const baseSalary = Number(get(row, 'baseSalary') || 0);
        const allowance = Number(get(row, 'allowance') || 0);
        const deduction = Number(get(row, 'deduction') || 0);
        const remarks = String(get(row, 'remarks') || '').trim();

        if (!emailAddress || !month) {
          errors.push({
            row: r,
            errors: ['employeeEmail and month are required'],
          });
          continue;
        }

        const employee = await this.employeeRepo.findOne({
          where: { emailAddress },
        });
        if (!employee) {
          errors.push({
            row: r,
            emailAddress,
            errors: [Messages.EmployeeNotFound],
          });
          continue;
        }

        const exists = await this.payrollRepo.findOne({
          where: { employeeId: employee.id, month },
        });

        const payload: Partial<Payroll> = {
          employeeId: employee.id,
          month,
          baseSalary: baseSalary || employee.salary || 0,
          allowance,
          deduction,
          netPay: (baseSalary || employee.salary || 0) + allowance - deduction,
          remarks,
          createdById: authenticatedUser.id,
          status: StateStatus.ACTIVE,
        };

        if (exists) {
          payload.id = exists.id;
        }

        toUpsert.push(payload);
      }

      const saved = await this.payrollRepo.save(toUpsert);
      return Response.success({
        upsertedCount: saved.length,
        failedCount: errors.length,
        failedRows: errors,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Error while processing payroll file');
    }
  }

  async exportPayrollCsv(filter: FilterDto): Promise<ApiResponse> {
    try {
      const where = Helpers.buildFilteredQuery(filter);
      const rows = await this.payrollRepo.find({
        where,
        order: { createdAt: 'DESC' },
        relations: { employee: true },
      });

      const headers = [
        'id',
        'employeeId',
        'employeeName',
        'month',
        'baseSalary',
        'allowance',
        'deduction',
        'netPay',
        'paymentStatus',
        'paymentRef',
        'paymentDate',
        'remarks',
        'createdAt',
      ];

      const csv = [
        headers.join(','),
        ...rows.map((p) =>
          [
            p.id,
            p.employeeId,
            p.employee ? `${p.employee.firstName} ${p.employee.lastName}` : '',
            p.month,
            p.baseSalary || 0,
            p.allowance || 0,
            p.deduction || 0,
            p.netPay || 0,
            p.paymentStatus || 'PENDING',
            p.paymentRef || '',
            p.paymentDate
              ? new Date(p.paymentDate).toISOString().slice(0, 10)
              : '',
            (p.remarks || '').replace(/[\r\n,]+/g, ' '),
            p.createdAt?.toISOString() || '',
          ].join(','),
        ),
      ].join('\n');

      return Response.success({
        fileName: `payroll_${Date.now()}.csv`,
        mimeType: 'text/csv',
        content: csv,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Unable to export payroll');
    }
  }
}
