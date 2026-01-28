import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class OfferDto {
  @IsNotEmpty()
  @IsNumber()
  saleId: number;

  @IsNotEmpty()
  @IsString()
  offerLetter: string;

  @IsOptional()
  @IsString()
  remark: string;
}
export class UpdateOfferDto extends PartialType(OfferDto) {}
