import {
  IsArray,
  IsLatLong,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class EstateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsString()
  lga: string;

  @IsOptional()
  @IsString()
  district: string;

  @IsNotEmpty()
  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  thumbnail: string;

  @IsOptional()
  @IsString()
  coordinates: string;

  @IsOptional()
  @IsString()
  design: string;

  @IsOptional()
  @IsString()
  planUrl: string;

  @IsOptional()
  @IsNumber()
  engineerId: number;

  @IsNotEmpty()
  @IsString()
  acquisitionType: string;

  @IsOptional()
  @IsNumber()
  acquisitionCost: number;

  @IsOptional()
  @IsArray()
  approvals: any[];

  @IsOptional()
  @IsString()
  features: string;

  @IsOptional()
  @IsString()
  description: string;
}
export class UpdateEstateDto extends PartialType(EstateDto) {}

export class EstateEngineerDto {
  @IsNotEmpty()
  @IsNumber()
  siteEngineerId: number;

  @IsNotEmpty()
  @IsNumber()
  estateId: number;
}
