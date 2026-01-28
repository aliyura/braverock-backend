import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as NodeCache from 'node-cache';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { validate } from 'class-validator';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { Response, Helpers } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { User } from 'src/schemas/user.schema';
import {
  AuthProvider,
  Currency,
  NotificationCategory,
  NotificationPriority,
  StateStatus,
  UserRole,
} from 'src/enums';
import { EmployeeDto, UpdateEmployeeDto } from 'src/dtos/hr/employee.dto';
import { Employee } from 'src/schemas/hr/employee.schema';
import { JwtService } from '@nestjs/jwt';
import { CryptoService } from '../crypto/crypto.service';
import { ProducerService } from 'src/queue/producer.service';
import { NotificationDto } from 'src/dtos/notification.dto';
import { Account } from 'src/schemas/accounting/account.schema';

@Injectable()
export class EmployeeService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
    private readonly queueProducerService: ProducerService,
  ) {}

  private canManage(user: User) {
    return (
      user.role === UserRole.SUPERADMIN ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.MANAGER ||
      user.role === UserRole.HR
    );
  }

  private buildNotification(
    to: User,
    subject: string,
    category: NotificationCategory,
  ): NotificationDto {
    return {
      from: 0,
      to,
      subject,
      category,
      enableEmail: true,
      enableSMS: true,
      enableInApp: false,
      priority: NotificationPriority.MEDIUM,
    } as NotificationDto;
  }

  private async createUserFromEmployee(
    dto: EmployeeDto,
    createdBy?: User,
  ): Promise<User> {
    const existingUser = await this.userRepo.findOne({
      where: [
        { emailAddress: dto.emailAddress },
        { phoneNumber: dto.phoneNumber },
      ],
    });
    if (existingUser) return existingUser;

    const password = dto.phoneNumber;
    const hashedPassword = await this.cryptoService.encrypt(password);

    const fullName = `${dto.firstName} ${dto.lastName}`.trim();

    const user = {
      name: fullName,
      emailAddress: dto.emailAddress,
      phoneNumber: dto.phoneNumber,

      dob: dto.dob,
      gender: dto.gender,
      maritalStatus: dto.maritalStatus,

      // Government ID
      governmentIdType: dto.governmentIdType,
      governmentIdNumber: dto.governmentIdNumber,
      governmentIdUrl: dto.governmentIdUrl,

      // Origin Information — NEW
      countryOfOrigin: dto.countryOfOrigin,
      stateOfOrigin: dto.stateOfOrigin,
      lgaOfOrigin: dto.lgaOfOrigin,
      originAddress: dto.originAddress,

      // Residential Information — UPDATED
      residentialCountry: dto.residentialCountry,
      residentialState: dto.residentialState,
      residentialCity: dto.residentialCity,
      residentialAddress: dto.residentialAddress,

      authProvider: AuthProvider.INTERNAL,
      role: UserRole.STAFF,
      status: StateStatus.ACTIVE,
      password: hashedPassword,
      createdById: createdBy ? createdBy.id : null,
    } as unknown as User;

    const savedUser = await this.userRepo.save(user);

    const notification = this.buildNotification(
      savedUser,
      'Employee Account Created',
      NotificationCategory.NEWACCOUNT,
    );
    await this.queueProducerService.publishNotification(notification);
    

    return savedUser;
  }

  // ----------------------------------------------------------
  // ADD EMPLOYEE
  // ----------------------------------------------------------
  async addEmployee(
    authenticatedUser: User,
    requestDto: EmployeeDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.canManage(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const exists = await this.employeeRepo.existsBy({
        emailAddress: requestDto.emailAddress,
      });
      if (exists) return Response.failure('EmployeeAlreadyExist');

      const entity = {
        ...requestDto,
        status: StateStatus.ACTIVE,
        createdById: authenticatedUser.id,
      };
      const savedEmployee = await this.employeeRepo.save(entity);
      if (savedEmployee) {
        const savedUser = await this.createUserFromEmployee(
          requestDto,
          authenticatedUser,
        );

        // Create account
        const accountOpeningRequest = {
          balance: 0,
          currency: Currency.NGN,
          description: `Account opened by ${authenticatedUser.name} on ${new Date().toISOString()}`,
          accountName: requestDto.accountName || null,
          accountNumber: requestDto.accountNumber || null,
          bankName: requestDto.bankName || null,
          userId: savedUser.id,
        } as Account;

        const openedAccount = await this.accountRepo.save(
          accountOpeningRequest,
        );
        if (openedAccount) {
          savedUser.accountId = openedAccount.id;
          await this.userRepo.save(savedUser);
        }
      }
      return Response.success(savedEmployee);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ----------------------------------------------------------
  // UPDATE EMPLOYEE
  // ----------------------------------------------------------
  async updateEmployee(
    id: number,
    authenticatedUser: User,
    dto: UpdateEmployeeDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.canManage(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const employee = await this.employeeRepo.findOne({ where: { id } });
      if (!employee) return Response.failure(Messages.EmployeeNotFound);

      const updateHistory = {
        ...dto,
        actionType: 'UPDATE',
        actionDate: new Date(),
        actionBy: authenticatedUser.id,
        actionByUser: (authenticatedUser as any).name,
      };

      const toUpdate = {
        ...employee,
        ...dto,
        updateHistory: [...(employee.updateHistory || []), updateHistory],
      };

      await this.employeeRepo.update({ id }, toUpdate);
      const updated = await this.employeeRepo.findOne({ where: { id } });

      return Response.success(updated);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ----------------------------------------------------------
  // DELETE EMPLOYEE
  // ----------------------------------------------------------
  async deleteEmployee(
    id: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (!this.canManage(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      await this.employeeRepo.delete(id);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ----------------------------------------------------------
  // GET EMPLOYEE BY ID
  // ----------------------------------------------------------
  async getEmployeeById(id: number): Promise<ApiResponse> {
    try {
      const employee = await this.employeeRepo.findOne({
        where: { id },
        relations: { createdBy: true },
      });

      if (!employee) return Response.failure(Messages.EmployeeNotFound);

      return Response.success(employee);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ----------------------------------------------------------
  // FIND ALL EMPLOYEES
  // ----------------------------------------------------------
  async findAllEmployees(
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

      const [result, count] = await this.employeeRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoEmployeeFound);

      const totalPages = Math.round(count / size) || (count > 0 ? 1 : 0);

      const analytic = {
        total: await this.employeeRepo.count(),
        active: await this.employeeRepo.count({
          where: { status: StateStatus.ACTIVE },
        }),
        inactive: await this.employeeRepo.count({
          where: { status: StateStatus.INACTIVE as any },
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
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ----------------------------------------------------------
  // SEARCH EMPLOYEES
  // ----------------------------------------------------------
  async searchEmployees(
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

      const targetFields = [
        'firstName',
        'lastName',
        'middleName',
        'emailAddress',
        'phoneNumber',
        'department',
        'position',
        'employmentType',
        'residentialAddress',
      ];

      const where = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
      );

      const [result, count] = await this.employeeRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoEmployeeFound);

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

  // ----------------------------------------------------------
  // BULK UPLOAD EMPLOYEES
  // ----------------------------------------------------------
  async bulkUploadEmployees(
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
      headerRow.eachCell((cell, colNumber) => {
        if (cell?.value)
          headerMap[String(cell.value).trim().toLowerCase()] = colNumber;
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

      const toCreate: Partial<Employee>[] = [];
      const errors: any[] = [];

      for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        if (!row || row.number === 1) continue;

        const dto = new EmployeeDto();
        dto.firstName = String(get(row, 'firstName') || '').trim();
        dto.lastName = String(get(row, 'lastName') || '').trim();
        dto.middleName = String(get(row, 'middleName') || '').trim();
        dto.emailAddress = String(get(row, 'emailAddress') || '').trim();
        dto.phoneNumber = String(get(row, 'phoneNumber') || '').trim();
        dto.department = String(get(row, 'department') || '').trim();
        dto.position = String(get(row, 'position') || '').trim();
        dto.gender = String(get(row, 'gender') || '').trim();
        dto.employmentType = String(get(row, 'employmentType') || '').trim();
        dto.salary = Number(get(row, 'salary') || 0);
        dto.maritalStatus = String(get(row, 'maritalStatus') || '').trim();
        dto.emergencyContact = String(
          get(row, 'emergencyContact') || '',
        ).trim();
        dto.governmentIdType = String(
          get(row, 'governmentIdType') || '',
        ).trim();
        dto.governmentIdNumber = String(
          get(row, 'governmentIdNumber') || '',
        ).trim();
        dto.governmentIdUrl = String(get(row, 'governmentIdUrl') || '').trim();
        dto.stateOfOrigin = String(get(row, 'stateOfOrigin') || '').trim();
        dto.residentialCountry = String(
          get(row, 'residentialCountry') || '',
        ).trim();
        dto.residentialState = String(
          get(row, 'residentialState') || '',
        ).trim();
        dto.residentialCity = String(get(row, 'residentialCity') || '').trim();
        dto.residentialAddress = String(
          get(row, 'residentialAddress') || '',
        ).trim();

        const dob = get(row, 'dob');
        if (dob) dto.dob = new dob();

        const hire = get(row, 'hireDate');
        if (hire) dto.hireDate = new Date(hire);

        const v = await validate(dto);
        if (v.length) {
          errors.push({
            row: r,
            errors: v.map((e) => Object.values(e.constraints || {})).flat(),
          });
          continue;
        }

        const exists = await this.employeeRepo.existsBy({
          emailAddress: dto.emailAddress,
        });

        if (exists) {
          errors.push({
            row: r,
            emailAddress: dto.emailAddress,
            errors: [Messages.EmplyeeAlreadyExist],
          });
          continue;
        }

        toCreate.push({
          ...dto,
          createdById: authenticatedUser.id,
          status: StateStatus.ACTIVE,
        } as unknown as Employee);
      }

      const created = await this.employeeRepo.save(toCreate);

      return Response.success({
        createdCount: created.length,
        failedCount: errors.length,
        failedRows: errors,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Error while processing employee file');
    }
  }

  // ----------------------------------------------------------
  // EXPORT EMPLOYEES TO CSV
  // ----------------------------------------------------------
  async exportEmployeesCsv(filter: FilterDto): Promise<ApiResponse> {
    try {
      const where = Helpers.buildFilteredQuery(filter);

      const rows = await this.employeeRepo.find({
        where,
        order: { createdAt: 'DESC' },
      });

      const headers = [
        'id',
        'firstName',
        'lastName',
        'middleName',
        'emailAddress',
        'phoneNumber',
        'department',
        'position',
        'employmentType',
        'salary',
        'status',
        'maritalStatus',
        'emergencyContact',
        'gender',
        'governmentIdType',
        'governmentIdNumber',
        'stateOfOrigin',
        'residentialCountry',
        'residentialState',
        'residentialCity',
        'residentialAddress',
        'dob',
        'hireDate',
        'createdAt',
      ];

      const csv = [
        headers.join(','),
        ...rows.map((e) =>
          [
            e.id,
            e.firstName,
            e.lastName,
            e.middleName || '',
            e.emailAddress,
            e.phoneNumber || '',
            e.department,
            e.position,
            e.employmentType || '',
            e.salary || 0,
            e.status || '',
            e.maritalStatus || '',
            e.emergencyContact || '',
            e.gender || '',
            e.governmentIdType || '',
            e.governmentIdNumber || '',
            e.stateOfOrigin || '',
            e.residentialCountry || '',
            e.residentialState || '',
            e.residentialCity || '',
            (e.residentialAddress || '').replace(/[\r\n,]+/g, ' '),
            e.dob ? new Date(e.dob).toISOString().slice(0, 10) : '',
            e.hireDate ? new Date(e.hireDate).toISOString().slice(0, 10) : '',
            e.createdAt?.toISOString() || '',
          ].join(','),
        ),
      ].join('\n');

      return Response.success({
        fileName: `employees_${Date.now()}.csv`,
        mimeType: 'text/csv',
        content: csv,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Unable to export employees');
    }
  }
}
