import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaymentFrequency, StateStatus } from 'src/enums';
import { PartialType } from '@nestjs/mapped-types';

export class PaymentPlanDto {
  @IsNotEmpty()
  @IsNumber()
  saleId: number;

  @IsOptional()
  @IsNumber()
  clientId?: number;

  @IsNotEmpty()
  @IsString()
  planName: string; // e.g., "6 Months Plan"

  @IsNotEmpty()
  @IsEnum(PaymentFrequency)
  frequency: PaymentFrequency;

  @IsOptional()
  @IsDateString()
  customDate?: string; // Used when frequency = CUSTOM

  @IsNotEmpty()
  @IsNumber()
  totalCycles: number;

  @IsNotEmpty()
  @IsNumber()
  amountPerCycle: number;

  @IsNotEmpty()
  @IsNumber()
  totalAmount: number;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  nextPaymentDate?: string; // optional: system can auto-generate

  @IsOptional()
  meta?: any;
}

export class UpdatePaymentPlanDto extends PartialType(PaymentPlanDto) {
  @IsOptional()
  @IsEnum(StateStatus)
  status?: StateStatus;
}


export class CancelPaymentPlanDto {
  @IsNotEmpty()
  @IsString()
  remark: string;
}
