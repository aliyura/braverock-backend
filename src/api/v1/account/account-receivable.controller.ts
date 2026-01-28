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
  AccountReceivableDto,
  UpdateAccountReceivableDto,
} from 'src/dtos/accounting/account-receivable.dto';
import { AccountReceivableService } from 'src/services/account/account-receivable.service';

@Controller('account-receivable')
export class AccountReceivableController {
  constructor(
    private receivableService: AccountReceivableService,
    private userService: UserService,
  ) {}

  /* ===================== ADD ===================== */

  @UseGuards(AppGuard)
  @Post('/')
  async addAccountReceivable(
    @Body() requestDto: AccountReceivableDto,
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

    const result = await this.receivableService.addAccountReceivable(
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
  async bulkUploadAccountReceivable(
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

    const result = await this.receivableService.bulkUploadAccountReceivables(
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
  async updateAccountReceivable(
    @Param('id') id: number,
    @Body() requestDto: UpdateAccountReceivableDto,
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

    const result = await this.receivableService.updateAccountReceivable(
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
  async deleteAccountReceivable(
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

    const result = await this.receivableService.deleteAccountReceivable(
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
  async getAccountReceivableById(
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

    const result = await this.receivableService.getAccountReceivableById(id);

    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message, result.payload);
  }

  /* ===================== LIST ===================== */

  @UseGuards(AppGuard)
  @Get('/list')
  async getAllAccountReceivables(
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

    const result = await this.receivableService.findAllAccountReceivables(
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
  async searchAccountReceivables(
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

    const result = await this.receivableService.searchAccountReceivables(
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
  async exportAccountReceivables(
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
      await this.receivableService.exportAccountReceivables(filter);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=account-receivables.xlsx',
    );
    res.send(buffer);
  }
}
