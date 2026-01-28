import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { UserService } from 'src/services/user/user.service';
import { AppGuard } from 'src/services/auth/app.guard';

import { SettlementDto } from 'src/dtos/investment/investment.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { InvestmentSettlementService } from 'src/services/investment/investment-settlement.service';

@Controller('investment/settlement')
export class InvestmentSettlementController {
  constructor(
    private readonly settlementService: InvestmentSettlementService,
    private readonly userService: UserService,
  ) {}

  // =====================================================
  // CREATE SETTLEMENT (ROI Paid)
  // =====================================================
  @UseGuards(AppGuard)
  @Post('/:investmentId')
  async settleInvestment(
    @Param('investmentId') investmentId: number,
    @Body() requestDto: SettlementDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.settlementService.settle(
      investmentId,
      user,
      requestDto,
    );

    if (result.success) return result;

    return Response.send(
      HttpStatus.BAD_REQUEST,
      result.message,
      result.payload,
    );
  }

  // =====================================================
  // UPDATE SETTLEMENT
  // =====================================================
  @UseGuards(AppGuard)
  @Patch('/:settlementId')
  async updateSettlement(
    @Param('settlementId') settlementId: number,
    @Body() requestDto: SettlementDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.settlementService.updateSettlement(
      settlementId,
      user,
      requestDto,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // =====================================================
  // CANCEL SETTLEMENT
  // =====================================================
  @UseGuards(AppGuard)
  @Delete('/:settlementId')
  async cancelSettlement(
    @Param('settlementId') settlementId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.settlementService.cancelSettlement(
      settlementId,
      user,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // =====================================================
  // GET SETTLEMENT BY ID
  // =====================================================
  @UseGuards(AppGuard)
  @Get('/details/:settlementId')
  async getSettlementById(
    @Param('settlementId') settlementId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.settlementService.getSettlementById(
      settlementId,
      user,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  // =====================================================
  // LIST SETTLEMENTS
  // =====================================================
  @UseGuards(AppGuard)
  @Get('/list')
  async listSettlements(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.settlementService.findAllSettlements(
      user,
      page,
      size,
      filter,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  // =====================================================
  // SEARCH SETTLEMENTS
  // =====================================================
  @UseGuards(AppGuard)
  @Get('/search')
  async searchSettlements(
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
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.settlementService.searchSettlements(
      user,
      page,
      size,
      search,
      filter,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }
}
