import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class AttendanceDto {
  @IsNotEmpty()
  @IsNumber()
  employeeId: number;

  @IsNotEmpty()
  @IsDateString()
  date: Date;

  @IsOptional()
  @IsString()
  checkInTime: string; // "08:00"

  @IsOptional()
  @IsString()
  checkOutTime: string; // "17:00"

  @IsOptional()
  @IsString()
  siteName: string;

  @IsOptional()
  @IsString()
  remarks: string;
}

export class UpdateAttendanceDto extends PartialType(AttendanceDto) {
  @IsOptional()
  @IsBoolean()
  isLate: boolean;

  @IsOptional()
  @IsBoolean()
  isAbsent: boolean;
}
