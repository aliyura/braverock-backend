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
import { LeaveService } from 'src/services/hr/leave.service';
import { UserService } from 'src/services/user/user.service';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { AppGuard } from 'src/services/auth/app.guard';
import { Response } from 'src/helpers';
import { LeaveDto, UpdateLeaveDto } from 'src/dtos/hr/leave.dto';

@Controller('leave')
export class LeaveController {
  constructor(
    private leaveService: LeaveService,
    private userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Post('/')
  async applyLeave(
    @Body() dto: LeaveDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.leaveService.applyLeave(auth.payload, dto);
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @UseGuards(AppGuard)
  @Put('/:id')
  async updateLeave(
    @Param('id') id: number,
    @Body() dto: UpdateLeaveDto,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.leaveService.updateLeave(id, auth.payload, dto);
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @UseGuards(AppGuard)
  @Post('/approve/:id')
  async approveLeave(
    @Param('id') id: number,
    @Query('approve') approve: boolean,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.leaveService.approveLeave(
      id,
      auth.payload,
      approve,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @UseGuards(AppGuard)
  @Delete('/:id')
  async deleteLeave(
    @Param('id') id: number,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.leaveService.deleteLeave(id, auth.payload);
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @Get('/details/:id')
  async getLeaveById(@Param('id') id: number): Promise<ApiResponse> {
    const result = await this.leaveService.getLeaveById(id);
    return result.success
      ? result
      : Response.send(HttpStatus.NOT_FOUND, result.message, result.payload);
  }

  @Get('/list')
  async getAllLeaves(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query() filter: FilterDto,
  ) {
    const result = await this.leaveService.findAllLeaves(page, size, filter);
    return result.success
      ? result
      : Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  @Get('/search')
  async searchLeaves(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('q') query: string,
    @Query() filter: FilterDto,
  ) {
    const result = await this.leaveService.searchLeaves(
      page,
      size,
      query,
      filter,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  @Get('/balance/:employeeId')
  async getLeaveBalance(@Param('employeeId') employeeId: number) {
    const result = await this.leaveService.getLeaveBalance(employeeId);
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message);
  }

  @Get('/export')
  async exportLeaves(@Query() filter: FilterDto): Promise<ApiResponse> {
    const result = await this.leaveService.exportLeavesCsv(filter);
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }
}
