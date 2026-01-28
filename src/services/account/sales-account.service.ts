import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';

import { SalesAccount } from 'src/schemas/accounting/sales-account.schema';
import {
  SalesAccountDto,
  UpdateSalesAccountDto,
} from 'src/dtos/accounting/sales-account.dto';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { User } from 'src/schemas/user.schema';

import { Helpers, Response } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { ActionType, StateStatus, UserRole } from 'src/enums';

@Injectable()
export class SalesAccountService {
  constructor(
    @InjectRepository(SalesAccount)
    private salesAccountRepo: Repository<SalesAccount>,
  ) {}

  /* ========================= ADD ========================= */

  async addSalesAccount(
    authenticatedUser: User,
    requestDto: SalesAccountDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.MANAGER &&
        authenticatedUser.role !== UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const request: SalesAccount = {
        ...requestDto,
        status: StateStatus.ACTIVE,
        createdById: authenticatedUser.id,
      } as SalesAccount;

      // Optional: compute grandTotal/balance if not provided
      if (
        (request.grandTotal == null || Number(request.grandTotal) === 0) &&
        (request.basePrice || request.facility)
      ) {
        request.grandTotal =
          Number(request.basePrice || 0) + Number(request.facility || 0);
      }

      if (request.balance == null || Number(request.balance) === 0) {
        request.balance =
          Number(request.grandTotal || 0) - Number(request.payment || 0);
      }

      const created = await this.salesAccountRepo.save(request);
      return Response.success(created);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= BULK UPLOAD ========================= */
  /**
   * Expected headers (flexible):
   * S/N | Client | Type | Block No | Unit | Base Price | Facility | Grand Total | Payment | Balance | Reference | MR A | MR B
   */
  async bulkUploadSalesAccount(
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

      const records: Partial<SalesAccount>[] = [];
      const errors: any[] = [];

      const num = (x: any) => {
        const v = Number(x);
        return Number.isFinite(v) ? v : 0;
      };

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (!row) continue;

        try {
          const basePrice = num(get(row, 'base price'));
          const facility = num(get(row, 'facility'));
          const grandTotal =
            num(get(row, 'grand total')) || basePrice + facility;
          const payment = num(get(row, 'payment'));
          const balance = num(get(row, 'balance')) || grandTotal - payment;

          const record: Partial<SalesAccount> = {
            serialNo: String(get(row, 's/n') || get(row, 's/no') || '').trim(),
            clientName: String(get(row, 'client') || '').trim(),
            type: String(get(row, 'type') || '').trim(),
            blockNo: String(
              get(row, 'block no') || get(row, 'block') || '',
            ).trim(),
            unit: String(get(row, 'unit') || '').trim(),
            basePrice,
            facility,
            grandTotal,
            payment,
            balance,
            reference: String(get(row, 'reference') || '').trim(),
            mrA: String(get(row, 'mr a') || '').trim(),
            mrB: String(get(row, 'mr b') || '').trim(),
            createdById: authenticatedUser.id,
            status: StateStatus.ACTIVE,
          };

          // basic guard: must have at least client or unit info
          if (!record.clientName && !record.unit) continue;

          records.push(record);
        } catch (err) {
          errors.push({ row: i, error: err });
        }
      }

      const created = await this.salesAccountRepo.save(records);

      return Response.success({
        createdCount: created.length,
        failedCount: errors.length,
        failedRows: errors,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Error while processing sales account file');
    }
  }

  /* ========================= UPDATE ========================= */

  async updateSalesAccount(
    id: number,
    authenticatedUser: User,
    requestDto: UpdateSalesAccountDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.MANAGER &&
        authenticatedUser.role !== UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const record = await this.salesAccountRepo.findOne({
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

      // recompute totals if needed
      const basePrice = Number(record.basePrice || 0);
      const facility = Number(record.facility || 0);

      if (record.grandTotal == null || Number(record.grandTotal) === 0) {
        record.grandTotal = basePrice + facility;
      }

      const payment = Number(record.payment || 0);
      record.balance = Number(record.grandTotal || 0) - payment;

      await this.salesAccountRepo.save(record);
      return Response.success(record);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= DELETE ========================= */

  async deleteSalesAccount(
    id: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN
      )
        return Response.failure(Messages.NoPermission);

      await this.salesAccountRepo.delete(id);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= GET BY ID ========================= */

  async getSalesAccountById(id: number): Promise<ApiResponse> {
    try {
      const record = await this.salesAccountRepo.findOne({
        where: { id },
        relations: { client: true, createdBy: true },
      });

      if (!record) return Response.failure(Messages.RecordNotFound);
      return Response.success(record);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= LIST + ANALYTICS ========================= */

  async findAllSalesAccount(
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

      const [result, count] = await this.salesAccountRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { client: true, createdBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoRecordFound);

      const analytic = {
        totalRecords: count,
        totalBasePrice: await this.salesAccountRepo.sum('basePrice'),
        totalFacility: await this.salesAccountRepo.sum('facility'),
        totalGrandTotal: await this.salesAccountRepo.sum('grandTotal'),
        totalPayment: await this.salesAccountRepo.sum('payment'),
        totalOutstanding: await this.salesAccountRepo.sum('balance'),
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

  async searchSalesAccount(
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
        'clientName',
        'type',
        'blockNo',
        'unit',
        'reference',
        'mrA',
        'mrB',
      ];

      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
      );

      const [result, count] = await this.salesAccountRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
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

  async exportSalesAccount(filter: FilterDto): Promise<Buffer> {
    const records = await this.salesAccountRepo.find({
      where: Helpers.buildFilteredQuery(filter),
      order: { createdAt: 'ASC' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sales Account');

    sheet.addRow([
      'S/No',
      'Client',
      'Type',
      'Block No',
      'Unit',
      'Base Price',
      'Facility',
      'Grand Total',
      'Payment',
      'Balance',
      'Reference',
      'MR A',
      'MR B',
    ]);

    records.forEach((r) =>
      sheet.addRow([
        r.serialNo,
        r.clientName,
        r.type,
        r.blockNo,
        r.unit,
        r.basePrice,
        r.facility,
        r.grandTotal,
        r.payment,
        r.balance,
        r.reference,
        r.mrA,
        r.mrB,
      ]),
    );

    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }
}
