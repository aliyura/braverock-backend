import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { PropertyVisibility } from 'src/enums';

export class LayoutDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  coordinates: string;

  @IsOptional()
  @IsString()
  thumbnail: string;

  @IsNotEmpty()
  @IsString()
  lga: string;

  @IsOptional()
  @IsString()
  district: string;

  @IsNotEmpty()
  @IsString()
  state: string;

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
  planUrl: string;

  @IsOptional()
  @IsString()
  features: string;

  @IsOptional()
  @IsString()
  description: string;
}
export class UpdateLayoutDto extends PartialType(LayoutDto) {
  @IsOptional()
  @IsEnum(PropertyVisibility, {
    message: 'Visibility must be PRIVATE | PUBLIC',
  })
  visibility: PropertyVisibility;
}
