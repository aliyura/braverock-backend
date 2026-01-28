import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as ExcelJS from 'exceljs';

import { AccountPayable } from 'src/schemas/accounting/account-payable.schema';
import {
  AccountPayableDto,
  UpdateAccountPayableDto,
} from 'src/dtos/accounting/account-payable.dto';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { User } from 'src/schemas/user.schema';

import { Helpers, Response } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { ActionType, StateStatus, UserRole } from 'src/enums';

@Injectable()
export class AccountPayableService {
  constructor(
    @InjectRepository(AccountPayable)
    private payableRepo: Repository<AccountPayable>,
  ) {}

  /* ========================= ADD ========================= */

  async addAccountPayable(
    authenticatedUser: User,
    requestDto: AccountPayableDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const request: AccountPayable = {
        ...requestDto,
        status: StateStatus.ACTIVE,
        createdById: authenticatedUser.id,
      } as unknown as AccountPayable;

      const created = await this.payableRepo.save(request);
      return Response.success(created);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= BULK UPLOAD ========================= */

  async bulkUploadAccountPayables(
    fileBuffer: Buffer,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const sheet = workbook.worksheets[0];

      const headerRow = sheet.getRow(1);
      const headerMap: Record<string, number> = {};

      headerRow.eachCell((cell, col) => {
        if (cell.value)
          headerMap[String(cell.value).toLowerCase().trim()] = col;
      });

      const get = (row: ExcelJS.Row, key: string) => {
        const col = headerMap[key.toLowerCase()];
        if (!col) return null;
        const val = row.getCell(col).value;
        if (typeof val === 'object' && val && 'result' in val)
          return val.result;
        return val;
      };

      const records: Partial<AccountPayable>[] = [];
      const errors: any[] = [];

      for (let i = 2; i <= sheet.rowCount; i++) {
        const row = sheet.getRow(i);
        if (!row) continue;

        try {
          const record: Partial<AccountPayable> = {
            date: new Date(get(row, 'date').toString()),
            description: String(get(row, 'description') || ''),
            reference: String(get(row, 'reference') || ''),
            debit: Number(get(row, 'debit') || 0),
            credit: Number(get(row, 'credit') || 0),
            balance: Number(get(row, 'balance') || 0),
            createdById: authenticatedUser.id,
            status: StateStatus.ACTIVE,
          };

          records.push(record);
        } catch (e) {
          errors.push({ row: i, error: e });
        }
      }

      const created = await this.payableRepo.save(records);

      return Response.success({
        createdCount: created.length,
        failedCount: errors.length,
        failedRows: errors,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Error processing bulk upload');
    }
  }

  /* ========================= UPDATE ========================= */

  async updateAccountPayable(
    id: number,
    authenticatedUser: User,
    requestDto: UpdateAccountPayableDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const record = await this.payableRepo.findOne({ where: { id } });
      if (!record) return Response.failure(Messages.RecordNotFound);

      const updateHistory = {
        ...requestDto,
        actionType: ActionType.UPDATE,
        actionDate: new Date(),
        actionBy: authenticatedUser.id,
        actionByUser: authenticatedUser.name,
      };

      record.updateHistory = record.updateHistory
        ? [...record.updateHistory, updateHistory]
        : [updateHistory];

      Object.assign(record, requestDto);

      await this.payableRepo.save(record);
      return Response.success(record);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= DELETE ========================= */

  async deleteAccountPayable(
    id: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      await this.payableRepo.delete(id);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= GET BY ID ========================= */

  async getAccountPayableById(id: number): Promise<ApiResponse> {
    try {
      const record = await this.payableRepo.findOne({
        where: { id },
        relations: { createdBy: true },
      });

      if (!record) return Response.failure(Messages.RecordNotFound);
      return Response.success(record);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= LIST + ANALYTICS ========================= */

  async findAllAccountPayables(
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
      const query = Helpers.buildFilteredQuery(filter);

      const [result, count] = await this.payableRepo.findAndCount({
        where: query,
        order: { date: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoRecordFound);

      const analytic = {
        totalDebit: await this.payableRepo.sum('debit'),
        totalCredit: await this.payableRepo.sum('credit'),
        totalBalance: await this.payableRepo.sum('balance'),
      };

      const totalPages = Math.round(count / size);

      return Response.success({
        analytic,
        page: result,
        size,
        currentPage: skip,
        totalPages: totalPages > 0 ? totalPages : count > 0 ? 1 : 0,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= SEARCH ========================= */

  async searchAccountPayables(
    page: number,
    limit: number,
    search: string,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;

      const skip = page > 0 ? Number(page) : 0;

      const targetFields = ['description', 'reference'];

      const query = Helpers.buildSearchQuery(search, targetFields, filter);

      const [result, count] = await this.payableRepo.findAndCount({
        where: query,
        order: { date: 'DESC' },
        take: size,
        skip: skip * size,
      });

      if (!result.length) return Response.failure(Messages.NoRecordFound);

      const totalPages = Math.round(count / size);

      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages: totalPages > 0 ? totalPages : count > 0 ? 1 : 0,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= EXPORT ========================= */

  async exportAccountPayables(filter: FilterDto): Promise<Buffer> {
    const records = await this.payableRepo.find({
      where: Helpers.buildFilteredQuery(filter),
      order: { date: 'ASC' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Account Payables');

    sheet.addRow([
      'Date',
      'Description',
      'Reference',
      'Debit',
      'Credit',
      'Balance',
    ]);

    records.forEach((r) =>
      sheet.addRow([
        r.date,
        r.description,
        r.reference,
        r.debit,
        r.credit,
        r.balance,
      ]),
    );

    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }
}
