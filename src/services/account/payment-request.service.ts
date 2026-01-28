import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';

import { PaymentRequest } from 'src/schemas/accounting/payment-request.schema';
import {
  PaymentRequestDto,
  UpdatePaymentRequestDto,
} from 'src/dtos/accounting/payment-request.dto';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { User } from 'src/schemas/user.schema';

import { Helpers, Response } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { ActionType, StateStatus, UserRole } from 'src/enums';

@Injectable()
export class PaymentRequestService {
  constructor(
    @InjectRepository(PaymentRequest)
    private paymentRequestRepo: Repository<PaymentRequest>,
  ) {}

  /* ========================= ADD ========================= */

  async addPaymentRequest(
    authenticatedUser: User,
    requestDto: PaymentRequestDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.MANAGER &&
        authenticatedUser.role !== UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const request: PaymentRequest = {
        ...requestDto,
        requestStatus: requestDto.requestStatus || StateStatus.PENDING,
        status: StateStatus.ACTIVE,
        createdById: authenticatedUser.id,
      } as PaymentRequest;

      const created = await this.paymentRequestRepo.save(request);
      return Response.success(created);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= BULK UPLOAD ========================= */

  async bulkUploadPaymentRequests(
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

      const records: Partial<PaymentRequest>[] = [];
      const errors: any[] = [];

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (!row) continue;

        try {
          const record: Partial<PaymentRequest> = {
            serialNo: String(get(row, 's/no') || '').trim(),
            accountName: String(get(row, 'account name') || '').trim(),
            accountNumber: String(get(row, 'account number') || '').trim(),
            bank: String(get(row, 'bank') || '').trim(),
            narration: String(get(row, 'narration') || '').trim(),
            amount: Number(get(row, 'amount') || 0),
            requestStatus: StateStatus.PENDING,
            createdById: authenticatedUser.id,
            status: StateStatus.ACTIVE,
          };

          records.push(record);
        } catch (err) {
          errors.push({ row: i, error: err });
        }
      }

      const created = await this.paymentRequestRepo.save(records);

      return Response.success({
        createdCount: created.length,
        failedCount: errors.length,
        failedRows: errors,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Error while processing payment request file');
    }
  }

  /* ========================= UPDATE ========================= */

  async updatePaymentRequest(
    id: number,
    authenticatedUser: User,
    requestDto: UpdatePaymentRequestDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.MANAGER &&
        authenticatedUser.role !== UserRole.ACCOUNTANT
      )
        return Response.failure(Messages.NoPermission);

      const record = await this.paymentRequestRepo.findOne({
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

      await this.paymentRequestRepo.save(record);
      return Response.success(record);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= STATUS CHANGE ========================= */

  async updatePaymentRequestStatus(
    id: number,
    status: StateStatus,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const record = await this.paymentRequestRepo.findOne({
        where: { id },
      });
      if (!record) return Response.failure(Messages.RecordNotFound);

      const updateHistory = {
        previousStatus: record.requestStatus,
        newStatus: status,
        actionType: ActionType.STATUS_UPDATE,
        actionDate: new Date(),
        actionBy: authenticatedUser.id,
        actionByUser: authenticatedUser.name,
      };

      record.requestStatus = status;
      record.updateHistory = record.updateHistory
        ? [...record.updateHistory, updateHistory]
        : [updateHistory];

      await this.paymentRequestRepo.save(record);
      return Response.success(record);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= DELETE ========================= */

  async deletePaymentRequest(
    id: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN
      )
        return Response.failure(Messages.NoPermission);

      await this.paymentRequestRepo.delete(id);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ========================= GET BY ID ========================= */

  async getPaymentRequestById(id: number): Promise<ApiResponse> {
    try {
      const record = await this.paymentRequestRepo.findOne({
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

  async findAllPaymentRequests(
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

      const [result, count] = await this.paymentRequestRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoRecordFound);

      const analytic = {
        totalAmount: await this.paymentRequestRepo.sum('amount'),
        pending: await this.paymentRequestRepo.count({
          where: { requestStatus: StateStatus.PENDING },
        }),
        approved: await this.paymentRequestRepo.count({
          where: { requestStatus: StateStatus.APPROVED },
        }),
        paid: await this.paymentRequestRepo.count({
          where: { requestStatus: StateStatus.PAID },
        }),
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

  async searchPaymentRequests(
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
        'accountName',
        'accountNumber',
        'bank',
        'narration',
      ];

      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
      );

      const [result, count] = await this.paymentRequestRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
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

  async exportPaymentRequests(filter: FilterDto): Promise<Buffer> {
    const records = await this.paymentRequestRepo.find({
      where: Helpers.buildFilteredQuery(filter),
      order: { createdAt: 'ASC' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Payment Requests');

    sheet.addRow([
      'S/No',
      'Account Name',
      'Account Number',
      'Bank',
      'Narration',
      'Amount',
      'Status',
    ]);

    records.forEach((r) =>
      sheet.addRow([
        r.serialNo,
        r.accountName,
        r.accountNumber,
        r.bank,
        r.narration,
        r.amount,
        r.requestStatus,
      ]),
    );

    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }
}
