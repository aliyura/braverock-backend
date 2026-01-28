import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CashBookDto {
  @IsOptional()
  @IsString()
  serialNo: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  particulars: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  reference: string;

  @IsOptional()
  @IsNumber()
  inflow: number;

  @IsOptional()
  @IsNumber()
  outflow: number;

  @IsOptional()
  @IsNumber()
  balance: number;

  @IsOptional()
  @IsString()
  projects: string;

  @IsOptional()
  @IsString()
  remarks: string;
}

export class UpdateCashBookDto extends PartialType(CashBookDto) {}
