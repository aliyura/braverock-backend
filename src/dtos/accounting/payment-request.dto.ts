import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { StateStatus } from 'src/enums';

export class PaymentRequestDto {
  @IsOptional()
  @IsString()
  serialNo: string;

  @IsNotEmpty()
  @IsString()
  accountName: string;

  @IsOptional()
  @IsString()
  accountNumber: string;

  @IsOptional()
  @IsString()
  bank: string;

  @IsOptional()
  @IsString()
  narration: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsEnum(StateStatus)
  requestStatus: StateStatus;

  @IsOptional()
  @IsNumber()
  voucherId: number;
}

export class UpdatePaymentRequestDto extends PartialType(PaymentRequestDto) {}
