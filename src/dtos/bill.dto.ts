import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { BillActivityDto } from './activity.dto';

export class BillDto {
  @IsNotEmpty()
  @IsNumber()
  estateId: number;

  @IsNotEmpty()
  @IsNumber()
  approverId: number;

  @IsNotEmpty()
  @IsArray()
  activities: BillActivityDto[];

  @IsOptional()
  @IsString()
  challenges?: string;

  @IsOptional()
  @IsString()
  materialsUsed?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}

export class UpdateBillDto extends PartialType(BillDto) {
  @IsOptional()
  @IsString()
  status?: string;
}