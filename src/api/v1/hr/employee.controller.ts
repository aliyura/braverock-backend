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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { EmployeeService } from 'src/services/hr/employee.service';
import { UserService } from 'src/services/user/user.service';
import { FilterDto } from 'src/dtos/filter.dto';
import { AppGuard } from 'src/services/auth/app.guard';
import { Response } from 'src/helpers';
import { EmployeeDto, UpdateEmployeeDto } from 'src/dtos/hr/employee.dto';

@Controller('employee')
export class EmployeeController {
  constructor(
    private employeeService: EmployeeService,
    private userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Post('/')
  async addEmployee(
    @Body() dto: EmployeeDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.employeeService.addEmployee(auth.payload, dto);
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @UseGuards(AppGuard)
  @Put('/:id')
  async updateEmployee(
    @Param('id') id: number,
    @Body() dto: UpdateEmployeeDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.employeeService.updateEmployee(
      id,
      auth.payload,
      dto,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @UseGuards(AppGuard)
  @Delete('/:id')
  async deleteEmployee(
    @Param('id') id: number,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.employeeService.deleteEmployee(id, auth.payload);
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @Get('/details/:id')
  async getEmployeeById(@Param('id') id: number): Promise<ApiResponse> {
    const result = await this.employeeService.getEmployeeById(id);
    return result.success
      ? result
      : Response.send(HttpStatus.NOT_FOUND, result.message, result.payload);
  }

  @Get('/list')
  async getAllEmployees(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.employeeService.findAllEmployees(
      auth.payload,
      page,
      size,
      filter,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  @Get('/search')
  async searchEmployees(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('q') search: string,
    @Query() filter: FilterDto,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.employeeService.searchEmployees(
      auth.payload,
      page,
      size,
      search,
      filter,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.NOT_FOUND, result.message);
  }

  @UseGuards(AppGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUploadEmployees(
    @UploadedFile() file,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.employeeService.bulkUploadEmployees(
      file.buffer,
      auth.payload,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @Get('/export')
  async exportEmployees(@Query() filter: FilterDto): Promise<ApiResponse> {
    const result = await this.employeeService.exportEmployeesCsv(filter);
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }
}
