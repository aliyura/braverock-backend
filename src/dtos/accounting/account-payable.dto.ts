import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class AccountPayableDto {
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  reference: string;

  @IsOptional()
  @IsNumber()
  debit: number;

  @IsOptional()
  @IsNumber()
  credit: number;

  @IsOptional()
  @IsNumber()
  balance: number;

  @IsOptional()
  @IsNumber()
  vendorId: number;

  @IsOptional()
  @IsNumber()
  estateId: number;

  @IsOptional()
  @IsNumber()
  saleId: number;
}

export class UpdateAccountPayableDto extends PartialType(AccountPayableDto) {}
