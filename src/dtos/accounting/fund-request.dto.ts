import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class FundRequestDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;
}

export class UpdateFundRequestDto extends PartialType(FundRequestDto) {
  @IsOptional()
  @IsString()
  status?: string;
}
