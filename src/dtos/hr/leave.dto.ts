import { IsDateString, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class LeaveDto {
  @IsNotEmpty()
  @IsNumber()
  employeeId: number;

  @IsNotEmpty()
  @IsString()
  leaveType: string;

  @IsNotEmpty()
  @IsDateString()
  startDate: Date;

  @IsNotEmpty()
  @IsDateString()
  endDate: Date;

  @IsOptional()
  @IsString()
  reason: string;
}

export class UpdateLeaveDto extends PartialType(LeaveDto) {
  @IsOptional()
  approvalStatus: string;
}
