import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateAccountDto {
  @IsNotEmpty()
  @IsString()
  accountName: string;

  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @IsNotEmpty()
  @IsString()
  bankName?: string;
}

export class AddPaymentDto {
  @IsNotEmpty()
  @IsNumber()
  paidAmount: number;

  @IsNotEmpty()
  @IsString()
  targetType: string;

  @IsOptional()
  @IsNumber()
  billId: number;

  @IsOptional()
  @IsNumber()
  incidentId: number;

  @IsOptional()
  @IsNumber()
  fundRequestId: number;

  @IsOptional()
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsString()
  reason: string;
}
