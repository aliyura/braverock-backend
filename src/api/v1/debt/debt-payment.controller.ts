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
import { ApiResponse } from '../../../dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { AppGuard } from 'src/services/auth/app.guard';
import { UserService } from 'src/services/user/user.service';
import { FilterDto } from 'src/dtos/filter.dto';
import { DebtPaymentService } from 'src/services/debt/debt-payment.service';
import { DebtPaymentDto } from 'src/dtos/accounting/debt.dto';

@Controller('debtpayment')
export class DebtPaymentController {
  constructor(
    private debtPaymentService: DebtPaymentService,
    private userService: UserService,
  ) { }

  @UseGuards(AppGuard)
  @Post('/:debtId')
  async addDebtPayment(
    @Body() requestDto: DebtPaymentDto,
    @Param('debtId') debtId: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;

    const result = await this.debtPaymentService.addDebtPayment(user, debtId, requestDto,);
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @UseGuards(AppGuard)
  @Delete('/:debtPaymentId')
  async deleteDebtPayment(
    @Headers('Authorization') token: string,
    @Param('debtPaymentId') debtPaymentId: number,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;

    const result = await this.debtPaymentService.deleteDebtPayment(
      debtPaymentId,
      user
    );
    if (result.success) {
      return result;
    }
    return Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }


  @UseGuards(AppGuard)
  @Get('/list')
  async getAllDebtPayments(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const result = await this.debtPaymentService.findAllDebtPayments(
      user,
      page,
      size,
      filter
    );
    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  @UseGuards(AppGuard)
  @Get('/search')
  async searchDebtPayments(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('q') searchText: string,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token && token.substring(7);
    const userResponse = await this.userService.authenticatedUserByToken(
      authToken,
    );
    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message, userResponse.payload);

    const user = userResponse.payload;
    const result = await this.debtPaymentService.searchDebtPayments(
      user,
      page,
      size,
      searchText,
      filter
    );
    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }
}
