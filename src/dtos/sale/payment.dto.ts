import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class PaymentDto {
  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  transactionRef: string;

  @IsOptional()
  @IsString()
  narration: string;

  @IsOptional()
  @IsString()
  transactionReceipt: string;
}
