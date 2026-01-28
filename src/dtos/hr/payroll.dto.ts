import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class PayrollDto {
  @IsNotEmpty()
  @IsNumber()
  employeeId: number;

  @IsNotEmpty()
  @IsString()
  month: string;

  @IsOptional()
  @IsNumber()
  baseSalary: number;

  @IsOptional()
  @IsNumber()
  allowance: number;

  @IsOptional()
  @IsNumber()
  deduction: number;

  @IsOptional()
  @IsNumber()
  netPay: number;

  @IsOptional()
  @IsString()
  paymentRef: string;

  @IsOptional()
  @IsString()
  remarks: string;
}

export class UpdatePayrollDto extends PartialType(PayrollDto) {
  @IsOptional()
  paymentStatus: string;
}
