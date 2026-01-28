import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';

import { AccountReceivable } from 'src/schemas/accounting/account-receivable.schema';
import {
  AccountReceivableDto,
  UpdateAccountReceivableDto,
} from 'src/dtos/accounting/account-receivable.dto';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { User } from 'src/schemas/user.schema';

import { Helpers, Response } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { ActionType, StateStatus, UserRole } from 'src/enums';

@Injectable()
export class AccountReceivableService {
  constructor(
    @InjectRepository(AccountReceivable)
    private receivableRepo: Repository<AccountReceivable>,
  ) {}

  /* ========================= ADD ========================= */

  async addAccountReceivable(
    authenticatedUser: User,
    requestDto: AccountReceivableDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.MANAGER &&
        authenticatedUser.role !== UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const request: AccountReceivable = {
        ...requestDto,
        status: StateStatus.ACTIVE,
        createdById: authenticatedUser.id,
      } as unknown as AccountReceivable;

      const created = await this.receivableRepo.save(request);
      return Response.success(created);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= BULK UPLOAD ========================= */

  async bulkUploadAccountReceivables(
    fileBuffer: Buffer,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const worksheet = workbook.worksheets[0];

      const headerRow = worksheet.getRow(1);
      const headerMap: Record<string, number> = {};

      headerRow.eachCell((cell, colNumber) => {
        if (cell.value) {
          headerMap[String(cell.value).toLowerCase().trim()] = colNumber;
        }
      });

      const get = (row: ExcelJS.Row, field: string) => {
        const col = headerMap[field.toLowerCase()];
        if (!col) return null;

        const val = row.getCell(col).value;
        if (val == null) return null;

        if (typeof val === 'object') {
          if ('text' in val) return val.text;
          if ('richText' in val)
            return val.richText.map((r) => r.text).join('');
          if ('formula' in val) return val.result;
        }

        return val;
      };

      const records: Partial<AccountReceivable>[] = [];
      const errors: any[] = [];

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (!row) continue;

        try {
          const record: Partial<AccountReceivable> = {
            date: new Date(get(row, 'date').toString()),
            description: String(get(row, 'description') || '').trim(),
            reference: String(get(row, 'reference') || '').trim(),
            debit: Number(get(row, 'debit') || 0),
            credit: Number(get(row, 'credit') || 0),
            balance: Number(get(row, 'balance') || 0),
            createdById: authenticatedUser.id,
            status: StateStatus.ACTIVE,
          };

          records.push(record);
        } catch (err) {
          errors.push({ row: i, error: err });
        }
      }

      const created = await this.receivableRepo.save(records);

      return Response.success({
        createdCount: created.length,
        failedCount: errors.length,
        failedRows: errors,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Error while processing file');
    }
  }

  /* ========================= UPDATE ========================= */

  async updateAccountReceivable(
    id: number,
    authenticatedUser: User,
    requestDto: UpdateAccountReceivableDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.MANAGER &&
        authenticatedUser.role !== UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const record = await this.receivableRepo.findOne({
        where: { id },
      });
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

      await this.receivableRepo.save(record);
      return Response.success(record);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= DELETE ========================= */

  async deleteAccountReceivable(
    id: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN
      )
        return Response.failure(Messages.NoPermission);

      await this.receivableRepo.delete(id);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= GET BY ID ========================= */

  async getAccountReceivableById(id: number): Promise<ApiResponse> {
    try {
      const record = await this.receivableRepo.findOne({
        where: { id },
        relations: { createdBy: true, client: true },
      });

      if (!record) return Response.failure(Messages.RecordNotFound);
      return Response.success(record);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= LIST + ANALYTICS ========================= */

  async findAllAccountReceivables(
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

      const [result, count] = await this.receivableRepo.findAndCount({
        where: query,
        order: { date: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true, client: true },
      });

      if (!result.length) return Response.failure(Messages.NoRecordFound);

      const analytic = {
        totalDebit: await this.receivableRepo.sum('debit'),
        totalCredit: await this.receivableRepo.sum('credit'),
        totalBalance: await this.receivableRepo.sum('balance'),
      };

      const totalPages = Math.round(count / size);

      return Response.success({
        analytic,
        page: result,
        size,
        currentPage: skip,
        totalPages:
          totalPages > 0 ? totalPages : count > 0 && result.length > 0 ? 1 : 0,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= SEARCH ========================= */

  async searchAccountReceivables(
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

      const targetFields = ['description', 'reference'];

      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
      );

      const [result, count] = await this.receivableRepo.findAndCount({
        where: query,
        order: { date: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { client: true, createdBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoRecordFound);

      const totalPages = Math.round(count / size);

      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages:
          totalPages > 0 ? totalPages : count > 0 && result.length > 0 ? 1 : 0,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= EXPORT ========================= */

  async exportAccountReceivables(filter: FilterDto): Promise<Buffer> {
    const records = await this.receivableRepo.find({
      where: Helpers.buildFilteredQuery(filter),
      order: { date: 'ASC' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Account Receivables');

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
