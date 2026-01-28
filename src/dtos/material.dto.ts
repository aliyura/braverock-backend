import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class MaterialDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsOptional()
  @IsNumber()
  estateId: number;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsNumber()
  unitPrice: number;

  @IsNotEmpty()
  @IsString()
  supplyStatus: string;

  @IsOptional()
  @IsString()
  supplierName: string;

  @IsOptional()
  @IsString()
  supplierTelephone: string;
}
export class UpdateMaterialDto extends PartialType(MaterialDto) {}

export class MaterialTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category: string;
}
export class UpdateMaterialTypeDto extends PartialType(MaterialTypeDto) {}

export class MaterialSupplyRequestItemDto {
  @IsNotEmpty()
  @IsString()
  materialName: string;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsNumber()
  currentStockLevel: number;

  @IsNotEmpty()
  @IsNumber()
  priorityLevel: string;

  @IsOptional()
  @IsNumber()
  requiredDate: string;

  @IsOptional()
  @IsString()
  description: string;
}

export class MaterialSupplyRequestDto {
  @IsOptional()
  @IsNumber()
  estateId: number;

  @IsNotEmpty()
  @IsArray()
  materials: MaterialSupplyRequestItemDto[];
}
export class UpdateMaterialSupplyRequestDto extends PartialType(
  MaterialSupplyRequestDto,
) {}

export class MaterialRequestItemDto {
  @IsNotEmpty()
  @IsString()
  materialName: string;

  @IsNotEmpty()
  @IsNumber()
  materialId: number;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsBoolean()
  giveAny: boolean;
}

export class MaterialRequestDto {
  @IsNotEmpty()
  @IsNumber()
  estateId: number;

  @IsNotEmpty()
  @IsArray()
  materials: MaterialRequestItemDto[];

  @IsNotEmpty()
  @IsString()
  description: string;
}
export class UpdateMaterialRequestDto extends PartialType(MaterialRequestDto) {}
