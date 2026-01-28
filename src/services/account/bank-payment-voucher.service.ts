import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { validate } from 'class-validator';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response, Helpers } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';

import { User } from 'src/schemas/user.schema';
import { FilterDto } from 'src/dtos/filter.dto';

import {
  BankPaymentVoucherDto,
  UpdateBankPaymentVoucherDto,
} from 'src/dtos/accounting/bank-payment-voucher.dto';

import { BankPaymentVoucher } from 'src/schemas/accounting/bank-payment-voucher.schema';
import { BankPaymentVoucherLine } from 'src/schemas/accounting/bank-payment-voucher-line.schema';

import { ActionType, UserRole, VoucherStatus } from 'src/enums';

@Injectable()
export class BankPaymentVoucherService {
  constructor(
    @InjectRepository(BankPaymentVoucher)
    private voucherRepo: Repository<BankPaymentVoucher>,

    @InjectRepository(BankPaymentVoucherLine)
    private voucherLineRepo: Repository<BankPaymentVoucherLine>,
  ) {}

  /* ===================== ADD ===================== */

  async addBankPaymentVoucher(
    authenticatedUser: User,
    requestDto: BankPaymentVoucherDto,
  ): Promise<ApiResponse> {
    try {
      if (
        ![
          UserRole.ADMIN,
          UserRole.SUPERADMIN,
          UserRole.MANAGER,
          UserRole.ACCOUNTANT,
        ].includes(authenticatedUser.role as UserRole)
      )
        return Response.failure(Messages.NoPermission);

      const voucher: BankPaymentVoucher = {
        voucherNo: requestDto.voucherNo,
        date: requestDto.date ? new Date(requestDto.date) : new Date(),
        payee: requestDto.payee,
        narration: requestDto.narration,
        chequeNo: requestDto.chequeNo,
        voucherStatus: requestDto.voucherStatus || VoucherStatus.DRAFT,
        createdById: authenticatedUser.id,
      } as BankPaymentVoucher;

      const created = await this.voucherRepo.save(voucher);
      return Response.success(created);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ===================== UPDATE ===================== */

  async updateBankPaymentVoucher(
    id: number,
    authenticatedUser: User,
    requestDto: UpdateBankPaymentVoucherDto,
  ): Promise<ApiResponse> {
    try {
      const voucher = await this.voucherRepo.findOne({
        where: { id },
        relations: { lines: true },
      });

      if (!voucher) return Response.failure('Voucher not found');

      if (
        voucher.voucherStatus !== VoucherStatus.DRAFT &&
        authenticatedUser.role !== UserRole.SUPERADMIN
      )
        return Response.failure('Only draft vouchers can be modified');

      const updateHistory = {
        ...requestDto,
        actionType: ActionType.UPDATE,
        actionDate: new Date(),
        actionBy: authenticatedUser.id,
        actionByUser: authenticatedUser.name,
      };

      voucher.voucherNo = requestDto.voucherNo ?? voucher.voucherNo;
      voucher.date = requestDto.date ? new Date(requestDto.date) : voucher.date;
      voucher.payee = requestDto.payee ?? voucher.payee;
      voucher.narration = requestDto.narration ?? voucher.narration;
      voucher.chequeNo = requestDto.chequeNo ?? voucher.chequeNo;
      voucher.voucherStatus = requestDto.voucherStatus ?? voucher.voucherStatus;


      voucher.updateHistory = voucher.updateHistory
        ? [...voucher.updateHistory, updateHistory]
        : [updateHistory];

      const updated = await this.voucherRepo.save(voucher);
      return Response.success(updated);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ===================== DELETE ===================== */

  async deleteBankPaymentVoucher(
    id: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      const voucher = await this.voucherRepo.findOne({ where: { id } });
      if (!voucher) return Response.failure('Voucher not found');

      await this.voucherRepo.delete(id);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  async bulkUploadBankPaymentVouchers(
    fileBuffer: Buffer,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        ![
          UserRole.ADMIN,
          UserRole.SUPERADMIN,
          UserRole.MANAGER,
          UserRole.ACCOUNTANT,
        ].includes(authenticatedUser.role as UserRole)
      )
        return Response.failure(Messages.NoPermission);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) return Response.failure('Invalid Excel sheet');

      /* ---------- MAP HEADERS ---------- */
      const headerRow = worksheet.getRow(1);
      const headerMap: Record<string, number> = {};

      headerRow.eachCell((cell, col) => {
        if (cell.value) {
          headerMap[String(cell.value).trim().toLowerCase()] = col;
        }
      });

      const getVal = (row: ExcelJS.Row, key: string) => {
        const col = headerMap[key.toLowerCase()];
        if (!col) return null;

        const cell = row.getCell(col).value;
        if (cell && typeof cell === 'object') {
          if ('text' in cell) return cell.text;
          if ('result' in cell) return cell.result;
        }
        return cell;
      };

      const vouchers: BankPaymentVoucher[] = [];
      const errors: any[] = [];

      /* ---------- EXPECTED EXCEL FORMAT ---------- */
      /**
       * voucherNo | date | payee | narration | chequeNo | accountName | accountCode | debit | credit | remarks
       * Lines are grouped by voucherNo
       */

      const voucherMap = new Map<string, BankPaymentVoucher>();

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (!row) continue;

        const voucherNo = String(getVal(row, 'voucherNo') || '').trim();
        if (!voucherNo) {
          errors.push({ row: i, error: 'Missing voucherNo' });
          continue;
        }

        let voucher = voucherMap.get(voucherNo);

        if (!voucher) {
          voucher = {
            voucherNo,
            date: getVal(row, 'date')
              ? new Date(getVal(row, 'date').toString())
              : new Date(),
            payee: String(getVal(row, 'payee') || '').trim(),
            narration: String(getVal(row, 'narration') || '').trim(),
            chequeNo: String(getVal(row, 'chequeNo') || '').trim(),
            voucherStatus: VoucherStatus.DRAFT,
            createdById: authenticatedUser.id,
            lines: [],
          } as BankPaymentVoucher;

          voucherMap.set(voucherNo, voucher);
          vouchers.push(voucher);
        }

        /* ---------- BUILD LINE ---------- */
        const line = new BankPaymentVoucherLine();
        line.serialNo = String(getVal(row, 'serialNo') || '').trim();
        line.accountName = String(getVal(row, 'accountName') || '').trim();
        line.accountCode = String(getVal(row, 'accountCode') || '').trim();
        line.debit = Number(getVal(row, 'debit') || 0);
        line.credit = Number(getVal(row, 'credit') || 0);
        line.remarks = String(getVal(row, 'remarks') || '').trim();
        line.chequeNo = String(getVal(row, 'chequeNo') || '').trim();

        if (!line.accountName) {
          errors.push({
            row: i,
            voucherNo,
            error: 'accountName is required',
          });
          continue;
        }

        voucher.lines.push(line);
      }

      if (!vouchers.length) return Response.failure('No valid vouchers found');

      const saved = await this.voucherRepo.save(vouchers);

      return Response.success({
        createdCount: saved.length,
        failedCount: errors.length,
        failedRows: errors,
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure('Error processing bank payment vouchers upload');
    }
  }

  /* ===================== DETAILS ===================== */

  async getBankPaymentVoucherById(id: number): Promise<ApiResponse> {
    try {
      const voucher = await this.voucherRepo.findOne({
        where: { id },
        relations: { lines: true, createdBy: true },
      });

      if (!voucher) return Response.failure('Voucher not found');
      return Response.success(voucher);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ===================== LIST ===================== */

  async findAllBankPaymentVouchers(
    page: number,
    limit: number,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size = limit || 15;
      const skip = page || 0;

      const query = Helpers.buildFilteredQuery(filter);

      const [result, count] = await this.voucherRepo.findAndCount({
        where: query,
        relations: { lines: true, createdBy: true },
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
      });

      if (!result.length) return Response.failure('No vouchers found');

      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages: Math.ceil(count / size),
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ===================== SEARCH ===================== */

  async searchBankPaymentVouchers(
    page: number,
    limit: number,
    search: string,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size = limit || 15;
      const skip = page || 0;

      const fields = [
        'voucherNo',
        'payee',
        'narration',
        'chequeNo',
        'voucherStatus',
      ];

      const query = Helpers.buildSearchQuery(search, fields, filter);

      const [result, count] = await this.voucherRepo.findAndCount({
        where: query,
        relations: { lines: true },
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
      });

      if (!result.length) return Response.failure('No vouchers found');

      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages: Math.ceil(count / size),
      });
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ===================== EXPORT ===================== */

  async exportBankPaymentVouchers(filter: FilterDto): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bank Payment Vouchers');

    sheet.columns = [
      { header: 'Voucher No', key: 'voucherNo', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Payee', key: 'payee', width: 25 },
      { header: 'Narration', key: 'narration', width: 35 },
      { header: 'Cheque No', key: 'chequeNo', width: 20 },
      { header: 'Status', key: 'voucherStatus', width: 15 },
    ];

    const vouchers = await this.voucherRepo.find({
      where: Helpers.buildFilteredQuery(filter),
      order: { createdAt: 'DESC' },
    });

    vouchers.forEach((v) => {
      sheet.addRow({
        voucherNo: v.voucherNo,
        date: v.date,
        payee: v.payee,
        narration: v.narration,
        chequeNo: v.chequeNo,
        voucherStatus: v.voucherStatus,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
