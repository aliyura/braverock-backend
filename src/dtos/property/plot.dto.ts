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

export class PlotDto {
  @IsOptional()
  @IsNumber()
  layoutId: number;

  @IsOptional()
  @IsNumber()
  estateId: number;

  @IsNotEmpty()
  @IsString()
  plotNumber: string;

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
  blockNumber: string;

  @IsOptional()
  @IsNumber()
  sizeSqm: number;

  @IsOptional()
  @IsString()
  coordinates: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  surveyPlanUrl: string;

  @IsOptional()
  @IsString()
  thumbnail: string;

  @IsOptional()
  @IsArray()
  documents: any[];

  @IsOptional()
  @IsString()
  acquisitionType: string;

  @IsOptional()
  @IsNumber()
  acquisitionCost: number;

  @IsOptional()
  @IsNumber()
  documentationFee: number;

  @IsOptional()
  @IsNumber()
  developmentFee: number;
}
export class UpdatePlotDto extends PartialType(PlotDto) {
  @IsOptional()
  @IsEnum(PropertyVisibility, {
    message: 'Visibility must be PRIVATE | PUBLIC',
  })
  visibility: PropertyVisibility;
}
