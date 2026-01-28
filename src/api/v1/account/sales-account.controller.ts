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
import { SalesAccountService } from 'src/services/account/sales-account.service';
import { SalesAccountDto, UpdateSalesAccountDto } from 'src/dtos/accounting/sales-account.dto';

@Controller('sales-account')
export class SalesAccountController {
  constructor(
    private salesAccountService: SalesAccountService,
    private userService: UserService,
  ) {}

  /* ===================== ADD ===================== */

  @UseGuards(AppGuard)
  @Post('/')
  async addSalesAccount(
    @Body() requestDto: SalesAccountDto,
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

    const result = await this.salesAccountService.addSalesAccount(
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
  async bulkUploadSalesAccounts(
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

    const result = await this.salesAccountService.bulkUploadSalesAccount(
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
  async updateSalesAccount(
    @Param('id') id: number,
    @Body() requestDto: UpdateSalesAccountDto,
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

    const result = await this.salesAccountService.updateSalesAccount(
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

  /* ===================== DELETE ===================== */

  @UseGuards(AppGuard)
  @Delete('/:id')
  async deleteSalesAccount(
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

    const result = await this.salesAccountService.deleteSalesAccount(
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
  async getSalesAccountById(
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

    const result = await this.salesAccountService.getSalesAccountById(id);

    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message, result.payload);
  }

  /* ===================== LIST ===================== */

  @UseGuards(AppGuard)
  @Get('/list')
  async getAllSalesAccounts(
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

    const result = await this.salesAccountService.findAllSalesAccount(
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
  async searchSalesAccounts(
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

    const result = await this.salesAccountService.searchSalesAccount(
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
  async exportSalesAccounts(
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
    @Res() res: ExpressResponse,
  ) {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return res.status(HttpStatus.UNAUTHORIZED).json(userResponse);

    const buffer = await this.salesAccountService.exportSalesAccount(filter);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=sales-accounts.xlsx',
    );
    res.send(buffer);
  }
}
