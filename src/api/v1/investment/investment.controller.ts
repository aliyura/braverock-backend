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

import { InvestmentService } from 'src/services/investment/investment.service';
import { UserService } from 'src/services/user/user.service';
import { AppGuard } from 'src/services/auth/app.guard';

import {
  InvestmentDto,
  UpdateInvestmentDto,
  ApproveInvestmentDto,
  ExtendDto,
} from 'src/dtos/investment/investment.dto';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { FilterDto } from 'src/dtos/filter.dto';

@Controller('investment')
export class InvestmentController {
  constructor(
    private readonly investmentService: InvestmentService,
    private readonly userService: UserService,
  ) {}

  // ======================================================
  // CLIENT: APPLY FOR INVESTMENT
  // ======================================================
  @Post('/apply')
  async applyInvestment(
    @Body() requestDto: InvestmentDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);

    // Authenticate (client can also use public token)
    let userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success) {
      userResponse =
        await this.userService.authenticatePublicRequestByToken(authToken);

      if (!userResponse.success)
        return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);
    }

    const user = userResponse.payload;

    const result = await this.investmentService.applyInvestment(
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

  // ======================================================
  // ADMIN: CREATE INVESTMENT
  // ======================================================
  @UseGuards(AppGuard)
  @Post('/')
  async addInvestment(
    @Body() requestDto: InvestmentDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.investmentService.addInvestment(user, requestDto);

    if (result.success) return result;

    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ======================================================
  // UPDATE INVESTMENT
  // ======================================================
  @UseGuards(AppGuard)
  @Patch('/:investmentId')
  async updateInvestment(
    @Param('investmentId') investmentId: number,
    @Body() requestDto: UpdateInvestmentDto,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.investmentService.updateInvestment(
      investmentId,
      user,
      requestDto,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ======================================================
  // APPROVE INVESTMENT
  // ======================================================
  @UseGuards(AppGuard)
  @Post('/approve/:investmentId')
  async approveInvestment(
    @Param('investmentId') investmentId: number,
    @Body() requestDto: ApproveInvestmentDto,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.investmentService.approveInvestment(
      investmentId,
      user,
      requestDto,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ======================================================
  // EXTEND INVESTMENT
  // ======================================================
  @UseGuards(AppGuard)
  @Post('/extend/:investmentId')
  async extendInvestment(
    @Param('investmentId') investmentId: number,
    @Body() requestDto: ExtendDto,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.investmentService.extendInvestment(
      investmentId,
      user,
      requestDto,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ======================================================
  // DELETE INVESTMENT
  // ======================================================
  @UseGuards(AppGuard)
  @Delete('/:investmentId')
  async deleteInvestment(
    @Param('investmentId') investmentId: number,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.investmentService.deleteInvestment(
      investmentId,
      user,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  // ======================================================
  // GET INVESTMENT BY ID
  // ======================================================
  @UseGuards(AppGuard)
  @Get('/details/:investmentId')
  async getInvestmentById(
    @Param('investmentId') investmentId: number,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);

    const userResponse =
      await this.userService.authenticatedUserByToken(authToken);

    if (!userResponse.success)
      return Response.send(HttpStatus.UNAUTHORIZED, userResponse.message);

    const user = userResponse.payload;

    const result = await this.investmentService.getInvestmentById(
      investmentId,
      user,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  // ======================================================
  // LIST INVESTMENTS
  // ======================================================
  @UseGuards(AppGuard)
  @Get('/list')
  async findAll(
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

    const result = await this.investmentService.findAllInvestments(
      user,
      page,
      size,
      filter,
    );

    if (result.success) return result;

    return Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  // ======================================================
  // SEARCH INVESTMENTS
  // ======================================================
  @UseGuards(AppGuard)
  @Get('/search')
  async search(
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

    const result = await this.investmentService.searchInvestments(
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
