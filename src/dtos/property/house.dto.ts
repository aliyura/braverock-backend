import {
  IsArray,
  IsEnum,
  IsLatLong,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { PropertyVisibility } from 'src/enums';

export class HouseDto {
  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  features: string;

  @IsOptional()
  @IsArray()
  photos: string[];

  @IsOptional()
  @IsString()
  coordinates: string;

  @IsOptional()
  @IsString()
  thumbnail: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsString()
  buildingType: string;

  @IsOptional()
  @IsString()
  plotNumber: string;

  @IsNotEmpty()
  @IsString()
  houseNumber: string;

  @IsOptional()
  @IsString()
  blockNumber: string;

  @IsOptional()
  @IsNumber()
  sizeSqm: number;

  @IsOptional()
  @IsNumber()
  bedRooms: number;

  @IsOptional()
  @IsNumber()
  livingRoom: number;

  @IsOptional()
  @IsNumber()
  kitchen: number;

  @IsOptional()
  @IsNumber()
  dianning: number;

  @IsOptional()
  @IsNumber()
  toilets: number;

  @IsOptional()
  @IsNumber()
  boysquater: number;

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
  @IsNumber()
  estateId: number;

  @IsOptional()
  @IsString()
  capacity: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

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

  @IsOptional()
  @IsString()
  design: string;
}


export class UpdateHouseDto extends PartialType(HouseDto) {
  @IsOptional()
  status: string;

  @IsOptional()
  @IsEnum(PropertyVisibility, {
    message: 'Visibility must be PRIVATE | PUBLIC',
  })
  visibility: PropertyVisibility;
}
