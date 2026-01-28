import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class DebtDto {

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  dueDate: string
}

export class UpdateDebtDto extends PartialType(DebtDto) { }


export class DebtPaymentDto {

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  paymentRef: string

  @IsOptional()
  @IsString()
  paymentMethod: string

  @IsOptional()
  @IsString()
  description: string;
}
