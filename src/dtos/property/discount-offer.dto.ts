import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { OfferAudiance, OfferDiscountType, PropertyType, PropertyVisibility } from 'src/enums';

export class DiscountOfferDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsEnum(OfferDiscountType, {
    message:
      'offerDiscountType must be DISCOUNT_AMOUNT | DISCOUNT_PERCENTAGE | BONUS',
  })
  offerType: OfferDiscountType;

  @IsOptional()
  @IsNumber()
  discountAmount: number;

  @IsOptional()
  @IsNumber()
  discountPercentage: number;

  @IsNotEmpty()
  @IsString()
  startDate: Date;

  @IsNotEmpty()
  @IsString()
  endDate: Date;

  @IsNotEmpty()
  @IsEnum(OfferAudiance, {
    message: 'audiance must be PUBLIC|AGENTS|CLIENTS',
  })
  audiance: OfferAudiance;

  @IsNotEmpty()
  @IsNumber()
  propertyId: number;

  @IsNotEmpty()
  @IsEnum(PropertyType, {
    message: 'PropertyType must be HOUSE | PLOT',
  })
  propertyType: PropertyType;
}

export class UpdateDiscountOfferDto extends PartialType(DiscountOfferDto) {
  @IsOptional()
  status: string;
  @IsOptional()
  @IsEnum(PropertyVisibility, {
    message: 'Visibility must be PRIVATE | PUBLIC',
  })
  visibility: PropertyVisibility;
}
