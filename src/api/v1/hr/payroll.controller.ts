import {
  Body,
  Controller,
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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import { PayrollService } from 'src/services/hr/payroll.service';
import { UserService } from 'src/services/user/user.service';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { AppGuard } from 'src/services/auth/app.guard';
import { Response } from 'src/helpers';
import { PayrollDto, UpdatePayrollDto } from 'src/dtos/hr/payroll.dto';

@Controller('payroll')
export class PayrollController {
  constructor(
    private payrollService: PayrollService,
    private userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Post('/')
  async createOrUpdatePayroll(
    @Body() dto: PayrollDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.payrollService.createOrUpdatePayroll(
      auth.payload,
      dto,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @UseGuards(AppGuard)
  @Put('/:id')
  async updatePayroll(
    @Param('id') id: number,
    @Body() dto: UpdatePayrollDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.payrollService.createOrUpdatePayroll(
      auth.payload,
      {
        ...dto,
        employeeId: dto.employeeId,
      } as PayrollDto,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @UseGuards(AppGuard)
  @Post('/mark-paid/:id')
  async markPaid(
    @Param('id') id: number,
    @Body('paymentRef') paymentRef: string,
    @Body('paymentDate') paymentDate: Date,
  ) {
    const result = await this.payrollService.markPaid(
      id,
      paymentRef,
      paymentDate,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @UseGuards(AppGuard)
  @Post('/generate')
  async generateForMonth(
    @Query('month') month: string,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.payrollService.generateForMonth(
      auth.payload,
      month,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @Get('/details/:id')
  async getPayrollById(@Param('id') id: number): Promise<ApiResponse> {
    const result = await this.payrollService.getPayrollById(id);
    return result.success
      ? result
      : Response.send(HttpStatus.NOT_FOUND, result.message, result.payload);
  }

  @Get('/list')
  async getAllPayrolls(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query() filter: FilterDto,
  ) {
    const result = await this.payrollService.findAllPayrolls(
      page,
      size,
      filter,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  @UseGuards(AppGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUploadPayroll(
    @UploadedFile() file,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.payrollService.bulkUploadPayroll(
      file.buffer,
      auth.payload,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @Get('/export')
  async exportPayroll(@Query() filter: FilterDto): Promise<ApiResponse> {
    const result = await this.payrollService.exportPayrollCsv(filter);
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }
}
