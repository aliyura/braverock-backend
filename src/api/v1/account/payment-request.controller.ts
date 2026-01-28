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
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import { Response as ExpressResponse } from 'express';
import { UserService } from 'src/services/user/user.service';
import { AppGuard } from 'src/services/auth/app.guard';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { FilterDto } from 'src/dtos/filter.dto';
import {
  PaymentRequestDto,
  UpdatePaymentRequestDto,
} from 'src/dtos/accounting/payment-request.dto';
import { PaymentRequestService } from 'src/services/account/payment-request.service';
import { StateStatus } from 'src/enums';

@Controller('payment-request')
export class PaymentRequestController {
  constructor(
    private paymentRequestService: PaymentRequestService,
    private userService: UserService,
  ) {}

  /* ===================== ADD ===================== */

  @UseGuards(AppGuard)
  @Post('/')
  async addPaymentRequest(
    @Body() requestDto: PaymentRequestDto,
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

    const result = await this.paymentRequestService.addPaymentRequest(
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

  /* ===================== BULK UPLOAD ===================== */

  @UseGuards(AppGuard)
  @Post('/upload')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUploadPaymentRequests(
    @UploadedFile() file,
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

    const result = await this.paymentRequestService.bulkUploadPaymentRequests(
      file.buffer,
      userResponse.payload,
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
  @Put('/:id')
  async updatePaymentRequest(
    @Param('id') id: number,
    @Body() requestDto: UpdatePaymentRequestDto,
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

    const result = await this.paymentRequestService.updatePaymentRequest(
      id,
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

  /* ===================== STATUS UPDATE ===================== */

  @UseGuards(AppGuard)
  @Put('/:id/status')
  async updatePaymentRequestStatus(
    @Param('id') id: number,
    @Query('status') status: StateStatus,
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

    const result = await this.paymentRequestService.updatePaymentRequestStatus(
      id,
      status,
      userResponse.payload,
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
  @Delete('/:id')
  async deletePaymentRequest(
    @Param('id') id: number,
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

    const result = await this.paymentRequestService.deletePaymentRequest(
      id,
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
  @Get('/details/:id')
  async getPaymentRequestById(
    @Param('id') id: number,
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

    const result = await this.paymentRequestService.getPaymentRequestById(id);

    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message, result.payload);
  }

  /* ===================== LIST ===================== */

  @UseGuards(AppGuard)
  @Get('/list')
  async getAllPaymentRequests(
    @Query('page') page: number,
    @Query('size') size: number,
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

    const result = await this.paymentRequestService.findAllPaymentRequests(
      page,
      size,
      filter,
    );

    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  /* ===================== SEARCH ===================== */

  @UseGuards(AppGuard)
  @Get('/search')
  async searchPaymentRequests(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('q') searchText: string,
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

    const result = await this.paymentRequestService.searchPaymentRequests(
      page,
      size,
      searchText,
      filter,
    );

    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  /* ===================== EXPORT ===================== */

  @UseGuards(AppGuard)
  @Get('/export')
  async exportPaymentRequests(
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
    @Res() res: ExpressResponse,
  ) {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return res.status(HttpStatus.UNAUTHORIZED).json(userResponse);

    const buffer =
      await this.paymentRequestService.exportPaymentRequests(filter);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=payment-requests.xlsx',
    );
    res.send(buffer);
  }
}
