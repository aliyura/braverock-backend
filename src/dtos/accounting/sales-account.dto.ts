import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class SalesAccountDto {
  @IsOptional()
  @IsString()
  serialNo: string;

  @IsNotEmpty()
  @IsString()
  clientName: string;

  @IsOptional()
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  blockNo: string;

  @IsOptional()
  @IsString()
  unit: string;

  @IsOptional()
  @IsNumber()
  basePrice: number;

  @IsOptional()
  @IsNumber()
  facility: number;

  @IsOptional()
  @IsNumber()
  grandTotal: number;

  @IsOptional()
  @IsNumber()
  payment: number;

  @IsOptional()
  @IsNumber()
  balance: number;

  @IsOptional()
  @IsString()
  reference: string;

  @IsOptional()
  @IsString()
  mrA: string;

  @IsOptional()
  @IsString()
  mrB: string;

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

export class UpdateSalesAccountDto extends PartialType(SalesAccountDto) {}
