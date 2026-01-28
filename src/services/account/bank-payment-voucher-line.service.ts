import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response, Helpers } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';

import { User } from 'src/schemas/user.schema';
import { FilterDto } from 'src/dtos/filter.dto';

import { BankPaymentVoucherLineDto } from 'src/dtos/accounting/bank-payment-voucher.dto';

import { BankPaymentVoucherLine } from 'src/schemas/accounting/bank-payment-voucher-line.schema';
import { BankPaymentVoucher } from 'src/schemas/accounting/bank-payment-voucher.schema';
import { UserRole } from 'src/enums';

@Injectable()
export class BankPaymentVoucherLineService {
  constructor(
    @InjectRepository(BankPaymentVoucherLine)
    private lineRepo: Repository<BankPaymentVoucherLine>,

    @InjectRepository(BankPaymentVoucher)
    private voucherRepo: Repository<BankPaymentVoucher>,
  ) {}

  /* ===================== ADD ===================== */

  async addVoucherLine(
    voucherId: number,
    authenticatedUser: User,
    requestDto: BankPaymentVoucherLineDto,
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

      const voucher = await this.voucherRepo.findOne({
        where: { id: voucherId },
      });
      if (!voucher) return Response.failure('Bank payment voucher not found');

      const line: BankPaymentVoucherLine = {
        ...requestDto,
        voucherId,
      } as BankPaymentVoucherLine;

      const created = await this.lineRepo.save(line);
      return Response.success(created);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ===================== UPDATE ===================== */

  async updateVoucherLine(
    lineId: number,
    authenticatedUser: User,
    requestDto: BankPaymentVoucherLineDto,
  ): Promise<ApiResponse> {
    try {
      const line = await this.lineRepo.findOne({
        where: { id: lineId },
      });
      if (!line) return Response.failure('Voucher line not found');

      const updated = await this.lineRepo.save({
        ...line,
        ...requestDto,
      });

      return Response.success(updated);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ===================== DELETE ===================== */

  async deleteVoucherLine(
    lineId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      await this.lineRepo.delete(lineId);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ===================== DETAILS ===================== */

  async getVoucherLineById(lineId: number): Promise<ApiResponse> {
    try {
      const line = await this.lineRepo.findOne({
        where: { id: lineId },
        relations: { voucher: true },
      });

      if (!line) return Response.failure('Voucher line not found');

      return Response.success(line);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ===================== LIST BY VOUCHER ===================== */

  async getLinesByVoucher(voucherId: number): Promise<ApiResponse> {
    try {
      const lines = await this.lineRepo.find({
        where: { voucherId },
        order: { createdAt: 'ASC' },
      });

      return Response.success(lines);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.Exception);
    }
  }

  /* ===================== SEARCH ===================== */

  async searchVoucherLines(
    page: number,
    limit: number,
    search: string,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size = limit || 15;
      const skip = page || 0;

      const fields = ['accountName', 'accountCode', 'remarks', 'chequeNo'];

      const query = Helpers.buildSearchQuery(search, fields, filter);

      const [result, count] = await this.lineRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
      });

      if (!result.length) return Response.failure('No voucher lines found');

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
}
