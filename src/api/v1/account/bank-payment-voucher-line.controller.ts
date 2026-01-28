import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from 'src/services/user/user.service';
import { AppGuard } from 'src/services/auth/app.guard';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { FilterDto } from 'src/dtos/filter.dto';

import { BankPaymentVoucherLineDto } from 'src/dtos/accounting/bank-payment-voucher.dto';
import { BankPaymentVoucherLineService } from 'src/services/account/bank-payment-voucher-line.service';

@Controller('bank-payment-voucher-line')
export class BankPaymentVoucherLineController {
  constructor(
    private lineService: BankPaymentVoucherLineService,
    private userService: UserService,
  ) {}

  /* ===================== ADD ===================== */

  @UseGuards(AppGuard)
  @Post('/:voucherId')
  async addVoucherLine(
    @Param('voucherId') voucherId: number,
    @Body() requestDto: BankPaymentVoucherLineDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const result = await this.lineService.addVoucherLine(
      voucherId,
      userResponse.payload,
      requestDto,
    );

    if (result.success) return result;
    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  /* ===================== UPDATE ===================== */

  @UseGuards(AppGuard)
  @Put('/:lineId')
  async updateVoucherLine(
    @Param('lineId') lineId: number,
    @Body() requestDto: BankPaymentVoucherLineDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const result = await this.lineService.updateVoucherLine(
      lineId,
      userResponse.payload,
      requestDto,
    );

    if (result.success) return result;
    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  /* ===================== DELETE ===================== */

  @UseGuards(AppGuard)
  @Delete('/:lineId')
  async deleteVoucherLine(
    @Param('lineId') lineId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const result = await this.lineService.deleteVoucherLine(
      lineId,
      userResponse.payload,
    );

    if (result.success) return result;
    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  /* ===================== DETAILS ===================== */

  @UseGuards(AppGuard)
  @Get('/details/:lineId')
  async getVoucherLineById(
    @Param('lineId') lineId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    const result = await this.lineService.getVoucherLineById(lineId);

    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message, result.payload);
  }

  /* ===================== LIST BY VOUCHER ===================== */

  @UseGuards(AppGuard)
  @Get('/voucher/:voucherId')
  async getLinesByVoucher(
    @Param('voucherId') voucherId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    return this.lineService.getLinesByVoucher(voucherId);
  }

  /* ===================== SEARCH ===================== */

  @UseGuards(AppGuard)
  @Get('/search')
  async searchVoucherLines(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('q') search: string,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        userResponse.message,
        userResponse.payload,
      );

    return this.lineService.searchVoucherLines(page, size, search, filter);
  }
}
