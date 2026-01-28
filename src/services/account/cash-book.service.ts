import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';

import { CashBook } from 'src/schemas/accounting/cash-book.schema';
import {
  CashBookDto,
  UpdateCashBookDto,
} from 'src/dtos/accounting/cash-book.dto';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { User } from 'src/schemas/user.schema';

import { Helpers, Response } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { ActionType, StateStatus, UserRole } from 'src/enums';

@Injectable()
export class CashBookService {
  constructor(
    @InjectRepository(CashBook)
    private cashBookRepo: Repository<CashBook>,
  ) {}

  /* ========================= ADD ========================= */

  async addCashBook(
    authenticatedUser: User,
    requestDto: CashBookDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.MANAGER &&
        authenticatedUser.role !== UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const request: CashBook = {
        ...requestDto,
        status: StateStatus.ACTIVE,
        createdById: authenticatedUser.id,
      } as unknown as CashBook;

      const created = await this.cashBookRepo.save(request);
      return Response.success(created);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= BULK UPLOAD ========================= */

  async bulkUploadCashBook(
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

      const records: Partial<CashBook>[] = [];
      const errors: any[] = [];

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (!row) continue;

        try {
          const record: Partial<CashBook> = {
            serialNo: String(get(row, 's/no') || '').trim(),
            date: new Date(get(row, 'date').toString()),
            particulars: String(get(row, 'particulars') || '').trim(),
            description: String(get(row, 'description') || '').trim(),
            reference: String(get(row, 'reference') || '').trim(),
            inflow: Number(get(row, 'inflow') || 0),
            outflow: Number(get(row, 'outflow') || 0),
            balance: Number(get(row, 'balance') || 0),
            projects: String(get(row, 'projects') || '').trim(),
            remarks: String(get(row, 'remarks') || '').trim(),
            createdById: authenticatedUser.id,
            status: StateStatus.ACTIVE,
          };

          records.push(record);
        } catch (err) {
          errors.push({ row: i, error: err });
        }
      }

      const created = await this.cashBookRepo.save(records);

      return Response.success({
        createdCount: created.length,
        failedCount: errors.length,
        failedRows: errors,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Error while processing cash book file');
    }
  }

  /* ========================= UPDATE ========================= */

  async updateCashBook(
    id: number,
    authenticatedUser: User,
    requestDto: UpdateCashBookDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.MANAGER &&
        authenticatedUser.role !== UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const record = await this.cashBookRepo.findOne({ where: { id } });
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

      await this.cashBookRepo.save(record);
      return Response.success(record);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= DELETE ========================= */

  async deleteCashBook(
    id: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN
      )
        return Response.failure(Messages.NoPermission);

      await this.cashBookRepo.delete(id);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= GET BY ID ========================= */

  async getCashBookById(id: number): Promise<ApiResponse> {
    try {
      const record = await this.cashBookRepo.findOne({
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

  async findAllCashBook(
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

      const [result, count] = await this.cashBookRepo.findAndCount({
        where: query,
        order: { date: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoRecordFound);

      const analytic = {
        totalInflow: await this.cashBookRepo.sum('inflow'),
        totalOutflow: await this.cashBookRepo.sum('outflow'),
        closingBalance: result.length > 0 ? result[0].balance : 0,
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

  async searchCashBook(
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
        'particulars',
        'description',
        'reference',
        'projects',
        'remarks',
      ];

      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
      );

      const [result, count] = await this.cashBookRepo.findAndCount({
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

  async exportCashBook(filter: FilterDto): Promise<Buffer> {
    const records = await this.cashBookRepo.find({
      where: Helpers.buildFilteredQuery(filter),
      order: { date: 'ASC' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Cash Book');

    sheet.addRow([
      'S/No',
      'Date',
      'Particulars',
      'Description',
      'Reference',
      'Inflow',
      'Outflow',
      'Balance',
      'Projects',
      'Remarks',
    ]);

    records.forEach((r) =>
      sheet.addRow([
        r.serialNo,
        r.date,
        r.particulars,
        r.description,
        r.reference,
        r.inflow,
        r.outflow,
        r.balance,
        r.projects,
        r.remarks,
      ]),
    );

    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }
}
