import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { StateStatus } from 'src/enums';

export class SuspensionDto {
  @IsNotEmpty()
  @IsNumber()
  employeeId: number;

  @IsNotEmpty()
  @IsDateString()
  startDate: Date;

  @IsOptional()
  @IsDateString()
  endDate: Date;

  @IsOptional()
  @IsString()
  violationType: string;

  @IsOptional()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  remarks: string;
}

export class UpdateSuspensionDto extends PartialType(SuspensionDto) {
  @IsOptional()
  @IsEnum(StateStatus)
  status: StateStatus;
}
