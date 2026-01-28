import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class AccountReceivableDto {
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
  clientId: number;

  @IsOptional()
  @IsNumber()
  estateId: number;

  @IsOptional()
  @IsNumber()
  saleId: number;
}

export class UpdateAccountReceivableDto extends PartialType(
  AccountReceivableDto,
) {}
