import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { PropertyType } from 'src/enums';

export class InspectionRequestDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  emailAddress?: string;

  @IsNotEmpty()
  @IsNumber()
  propertyId: number;

  @IsNotEmpty()
  @IsEnum(PropertyType, { message: 'propertyType must be HOUSE or PLOT' })
  propertyType: PropertyType;

  @IsNotEmpty()
  @IsString()
  preferredDate: string;

  @IsNotEmpty()
  @IsString()
  preferredTime: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class UpdateInspectionRequestDto extends PartialType(
  InspectionRequestDto,
) {
  @IsOptional()
  status: string;
}