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

import {
  PaymentPlanDto,
  UpdatePaymentPlanDto,
  CancelPaymentPlanDto,
} from 'src/dtos/sale/payment-plan.dto';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { FilterDto } from 'src/dtos/filter.dto';
import { PaymentPlanService } from 'src/services/payment/payment-plan.service';

@Controller('payment-plan')
export class PaymentPlanController {
  constructor(
    private readonly paymentPlanService: PaymentPlanService,
    private readonly userService: UserService,
  ) {}

  // ======================================================
  // CREATE PAYMENT PLAN (ADMIN / MANAGEMENT ONLY)
  // ======================================================
  @UseGuards(AppGuard)
  @Post('/')
  async createPaymentPlan(
    @Body() requestDto: PaymentPlanDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.paymentPlanService.createPaymentPlan(
      user,
      requestDto,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ======================================================
  // UPDATE PAYMENT PLAN
  // ======================================================
  @UseGuards(AppGuard)
  @Patch('/:planId')
  async updatePaymentPlan(
    @Param('planId') planId: number,
    @Body() requestDto: UpdatePaymentPlanDto,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.paymentPlanService.updatePaymentPlan(
      planId,
      user,
      requestDto,
    );

    if (result.success) return result;
    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ======================================================
  // CANCEL PAYMENT PLAN
  // ======================================================
  @UseGuards(AppGuard)
  @Post('/cancel/:planId')
  async cancelPaymentPlan(
    @Param('planId') planId: number,
    @Body() requestDto: CancelPaymentPlanDto,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.paymentPlanService.cancelPaymentPlan(
      planId,
      user,
      requestDto,
    );

    if (result.success) return result;
    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ======================================================
  // GET PAYMENT PLAN BY ID
  // ======================================================
  @UseGuards(AppGuard)
  @Get('/details/:planId')
  async getPaymentPlanById(
    @Param('planId') planId: number,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.paymentPlanService.getPaymentPlanById(
      planId,
      user,
    );

    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  // ======================================================
  // LIST PAYMENT PLANS (ALL)
  // ======================================================
  @UseGuards(AppGuard)
  @Get('/list')
  async findAllPaymentPlans(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.paymentPlanService.findAllPaymentPlans(
      user,
      page,
      size,
      filter,
    );

    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  // ======================================================
  // LIST PAYMENT PLANS BY SALE
  // ======================================================
  @UseGuards(AppGuard)
  @Get('/sale/:saleId')
  async getPaymentPlansBySale(
    @Param('saleId') saleId: number,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.paymentPlanService.getPaymentPlansBySale(
      saleId,
      user,
    );

    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  // ======================================================
  // SEARCH PAYMENT PLANS
  // ======================================================
  @UseGuards(AppGuard)
  @Get('/search')
  async searchPaymentPlans(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('q') q: string,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.paymentPlanService.searchPaymentPlans(
      user,
      page,
      size,
      q,
      filter,
    );

    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }
}
