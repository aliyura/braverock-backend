import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { VoucherStatus } from 'src/enums';

export class BankPaymentVoucherLineDto {
  @IsOptional()
  @IsString()
  serialNo: string;

  @IsNotEmpty()
  @IsString()
  accountName: string;

  @IsOptional()
  @IsString()
  accountCode: string;

  @IsOptional()
  @IsNumber()
  debit: number;

  @IsOptional()
  @IsNumber()
  credit: number;

  @IsOptional()
  @IsString()
  chequeNo: string;

  @IsOptional()
  @IsString()
  remarks: string;
}

export class BankPaymentVoucherDto {
  @IsOptional()
  @IsString()
  voucherNo: string;

  @IsOptional()
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  payee: string;

  @IsOptional()
  @IsString()
  narration: string;

  @IsOptional()
  @IsString()
  chequeNo: string;

  @IsOptional()
  @IsEnum(VoucherStatus)
  voucherStatus: VoucherStatus;
}

export class UpdateBankPaymentVoucherDto extends PartialType(BankPaymentVoucherDto) {}
