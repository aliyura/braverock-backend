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
import { PettyCashService } from 'src/services/account/petty-cash.service';
import { PettyCashDto, UpdatePettyCashDto } from 'src/dtos/accounting/petty-cash-transaction.dto';

@Controller('petty-cash')
export class PettyCashController {
  constructor(
    private pettyCashService: PettyCashService,
    private userService: UserService,
  ) {}

  /* ===================== ADD ===================== */

  @UseGuards(AppGuard)
  @Post('/')
  async addPettyCash(
    @Body() requestDto: PettyCashDto,
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

    const result = await this.pettyCashService.addPettyCash(
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
  async bulkUploadPettyCash(
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

    const result = await this.pettyCashService.bulkUploadPettyCash(
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
  async updatePettyCash(
    @Param('id') id: number,
    @Body() requestDto: UpdatePettyCashDto,
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

    const result = await this.pettyCashService.updatePettyCash(
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
  async deletePettyCash(
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

    const result = await this.pettyCashService.deletePettyCash(
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
  async getPettyCashById(
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

    const result = await this.pettyCashService.getPettyCashById(id);

    if (result.success) return result;
    return Response.send(HttpStatus.NOT_FOUND, result.message, result.payload);
  }

  /* ===================== LIST ===================== */

  @UseGuards(AppGuard)
  @Get('/list')
  async getAllPettyCash(
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

    const result = await this.pettyCashService.findAllPettyCash(
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
  async searchPettyCash(
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

    const result = await this.pettyCashService.searchPettyCash(
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
  async exportPettyCash(
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
    @Res() res: ExpressResponse,
  ) {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return res.status(HttpStatus.UNAUTHORIZED).json(userResponse);

    const buffer = await this.pettyCashService.exportPettyCash(filter);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=petty-cash.xlsx',
    );
    res.send(buffer);
  }
}
