import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import {
  PettyCashDto,
  UpdatePettyCashDto,
} from 'src/dtos/accounting/petty-cash-transaction.dto';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { User } from 'src/schemas/user.schema';

import { Helpers, Response } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import {
  ActionType,
  PettyCashDirection,
  StateStatus,
  UserRole,
} from 'src/enums';
import { PettyCash } from 'src/schemas/accounting/petty-cash.schema';

@Injectable()
export class PettyCashService {
  constructor(
    @InjectRepository(PettyCash)
    private pettyCashRepo: Repository<PettyCash>,
  ) {}

  /* ========================= ADD ========================= */

  async addPettyCash(
    authenticatedUser: User,
    requestDto: PettyCashDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.MANAGER &&
        authenticatedUser.role !== UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const record: PettyCash = {
        ...requestDto,
        status: StateStatus.ACTIVE,
        createdById: authenticatedUser.id,
      } as unknown as PettyCash;

      const created = await this.pettyCashRepo.save(record);
      return Response.success(created);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= BULK UPLOAD ========================= */
  /**
   * Expected headers:
   * DATE | DESCRIPTION | AMOUNT | TYPE (INCOME / EXPENDITURE) | PERIOD
   */
  async bulkUploadPettyCash(
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

      headerRow.eachCell((cell, col) => {
        if (cell.value)
          headerMap[String(cell.value).toLowerCase().trim()] = col;
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

      const records: Partial<PettyCash>[] = [];
      const errors: any[] = [];

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (!row) continue;

        try {
          const direction =
            String(get(row, 'type') || '')
              .toUpperCase()
              .trim() === 'INCOME'
              ? PettyCashDirection.INCOME
              : PettyCashDirection.EXPENDITURE;

          const record: Partial<PettyCash> = {
            date: new Date(get(row, 'date').toString()),
            description: String(get(row, 'description') || '').trim(),
            amount: Number(get(row, 'amount') || 0),
            direction,
            periodLabel: String(get(row, 'period') || '').trim(),
            createdById: authenticatedUser.id,
            status: StateStatus.ACTIVE,
          };

          if (!record.description || !record.amount) continue;

          records.push(record);
        } catch (err) {
          errors.push({ row: i, error: err });
        }
      }

      const created = await this.pettyCashRepo.save(records);

      return Response.success({
        createdCount: created.length,
        failedCount: errors.length,
        failedRows: errors,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Error while processing petty cash file');
    }
  }

  /* ========================= UPDATE ========================= */

  async updatePettyCash(
    id: number,
    authenticatedUser: User,
    requestDto: UpdatePettyCashDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.MANAGER &&
        authenticatedUser.role !== UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const record = await this.pettyCashRepo.findOne({ where: { id } });
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

      await this.pettyCashRepo.save(record);
      return Response.success(record);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= DELETE ========================= */

  async deletePettyCash(
    id: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN
      )
        return Response.failure(Messages.NoPermission);

      await this.pettyCashRepo.delete(id);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= GET BY ID ========================= */

  async getPettyCashById(id: number): Promise<ApiResponse> {
    try {
      const record = await this.pettyCashRepo.findOne({
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

  async findAllPettyCash(
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

      const [result, count] = await this.pettyCashRepo.findAndCount({
        where: query,
        order: { date: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoRecordFound);

      const income = await this.pettyCashRepo.sum('amount', {
        direction: PettyCashDirection.INCOME,
      } as any);

      const expenditure = await this.pettyCashRepo.sum('amount', {
        direction: PettyCashDirection.EXPENDITURE,
      } as any);

      const analytic = {
        totalIncome: income || 0,
        totalExpenditure: expenditure || 0,
        netBalance: (income || 0) - (expenditure || 0),
        total: count,
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

  async searchPettyCash(
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

      const targetFields = ['description', 'periodLabel'];

      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
      );

      const [result, count] = await this.pettyCashRepo.findAndCount({
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
        totalPages:
          totalPages > 0 ? totalPages : count > 0 && result.length > 0 ? 1 : 0,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= EXPORT ========================= */

  async exportPettyCash(filter: FilterDto): Promise<Buffer> {
    const records = await this.pettyCashRepo.find({
      where: Helpers.buildFilteredQuery(filter),
      order: { date: 'ASC' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Petty Cash');

    sheet.addRow(['Date', 'Description', 'Type', 'Amount', 'Period']);

    records.forEach((r) =>
      sheet.addRow([
        r.date,
        r.description,
        r.direction,
        r.amount,
        r.periodLabel,
      ]),
    );

    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }
}
