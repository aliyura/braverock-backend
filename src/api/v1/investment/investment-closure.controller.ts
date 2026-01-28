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

import { InvestmentClosureService } from 'src/services/investment/investment-closure.service';
import { UserService } from 'src/services/user/user.service';
import { AppGuard } from 'src/services/auth/app.guard';

import { CloseInvestmentDto } from 'src/dtos/investment/investment.dto';
import { FilterDto } from 'src/dtos/filter.dto';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response } from 'src/helpers';

@Controller('investment/closure')
export class InvestmentClosureController {
  constructor(
    private readonly closureService: InvestmentClosureService,
    private readonly userService: UserService,
  ) {}

  // ============================================================
  // CLOSE INVESTMENT (Refund & Final Closure)
  // ============================================================
  @UseGuards(AppGuard)
  @Post('/:investmentId')
  async closeInvestment(
    @Param('investmentId') investmentId: number,
    @Body() requestDto: CloseInvestmentDto,
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

    const user = userResponse.payload;

    const result = await this.closureService.closeInvestment(
      investmentId,
      user,
      requestDto,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ============================================================
  // UPDATE CLOSURE RECORD
  // ============================================================
  @UseGuards(AppGuard)
  @Patch('/:closureId')
  async updateClosure(
    @Param('closureId') closureId: number,
    @Body() requestDto: CloseInvestmentDto,
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

    const user = userResponse.payload;

    const result = await this.closureService.updateClosure(
      closureId,
      user,
      requestDto,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ============================================================
  // CANCEL CLOSURE
  // ============================================================
  @UseGuards(AppGuard)
  @Delete('/:closureId')
  async cancelClosure(
    @Param('closureId') closureId: number,
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

    const user = userResponse.payload;

    const result = await this.closureService.cancelClosure(closureId, user);

    if (result.success) return result;

    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ============================================================
  // GET CLOSURE BY ID
  // ============================================================
  @UseGuards(AppGuard)
  @Get('/details/:closureId')
  async getClosureById(
    @Param('closureId') closureId: number,
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

    const user = userResponse.payload;

    const result = await this.closureService.getClosureById(closureId, user);

    if (result.success) return result;

    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  // ============================================================
  // LIST ALL CLOSURES
  // ============================================================
  @UseGuards(AppGuard)
  @Get('/list')
  async listClosures(
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

    const result = await this.closureService.findAllClosures(
      user,
      page,
      size,
      filter,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  // ============================================================
  // SEARCH CLOSURES
  // ============================================================
  @UseGuards(AppGuard)
  @Get('/search')
  async searchClosures(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('q') searchString: string,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.closureService.searchClosures(
      user,
      page,
      size,
      searchString,
      filter,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }
}
