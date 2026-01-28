import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { PropertyType } from 'src/enums';

export class ReservationDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  emailAddress: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsNotEmpty()
  @IsNumber()
  propertyId: number;

  @IsNotEmpty()
  @IsEnum(PropertyType, { message: 'propertyType must be HOUSE or PLOT' })
  propertyType: PropertyType;

  @IsOptional()
  @IsNumber()
  clientId: number;

  @IsOptional()
  @IsString()
  description: string;
}

export class UpdateReservationDto extends PartialType(ReservationDto) {
  @IsOptional()
  status: string;
}

export class ReservationValidationDto {
  @IsNotEmpty()
  @IsNumber()
  reservationCode: number;
}
