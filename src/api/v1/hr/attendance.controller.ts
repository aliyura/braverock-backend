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
import { AttendanceService } from 'src/services/hr/attendance.service';
import { UserService } from 'src/services/user/user.service';
import { FilterDto } from 'src/dtos/filter.dto';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { AppGuard } from 'src/services/auth/app.guard';
import { Response } from 'src/helpers';
import { AttendanceDto, UpdateAttendanceDto } from 'src/dtos/hr/attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(
    private attendanceService: AttendanceService,
    private userService: UserService,
  ) {}

  @UseGuards(AppGuard)
  @Post('/')
  async markAttendance(
    @Body() dto: AttendanceDto,
    @Headers('Authorization') token: string,
  ): Promise<ApiResponse> {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.attendanceService.markAttendance(
      auth.payload,
      dto,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @UseGuards(AppGuard)
  @Put('/:id')
  async updateAttendance(
    @Param('id') id: number,
    @Body() dto: UpdateAttendanceDto,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.attendanceService.updateAttendance(
      id,
      auth.payload,
      dto,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @UseGuards(AppGuard)
  @Post('/absent')
  async markAbsent(
    @Body('employeeId') employeeId: number,
    @Body('date') date: Date,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.attendanceService.markAbsent(
      employeeId,
      date,
      auth.payload,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @Get('/details/:id')
  async getAttendanceById(@Param('id') id: number): Promise<ApiResponse> {
    const result = await this.attendanceService.getAttendanceById(id);
    return result.success
      ? result
      : Response.send(HttpStatus.NOT_FOUND, result.message, result.payload);
  }

  @Get('/list')
  async getAllAttendance(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query() filter: FilterDto,
  ) {
    const result = await this.attendanceService.findAllAttendance(
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
  async bulkUpload(
    @UploadedFile() file,
    @Headers('Authorization') token: string,
  ) {
    const authToken = token?.substring(7);
    const auth = await this.userService.authenticatedUserByToken(authToken);
    if (!auth.success)
      return Response.send(HttpStatus.UNAUTHORIZED, auth.message, auth.payload);

    const result = await this.attendanceService.bulkUploadAttendance(
      file.buffer,
      auth.payload,
    );
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }

  @Get('/export')
  async exportAttendance(@Query() filter: FilterDto): Promise<ApiResponse> {
    const result = await this.attendanceService.exportAttendanceCsv(filter);
    return result.success
      ? result
      : Response.send(HttpStatus.BAD_REQUEST, result.message, result.payload);
  }
}
