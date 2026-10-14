import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ExpenseTargetType } from 'src/enums';

export class ExpenseDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsNotEmpty()
  @IsEnum(ExpenseTargetType)
  targetType: string;

  @IsOptional()
  @IsNumber()
  estateId?: number;

  @IsOptional()
  @IsNumber()
  layoutId?: number;

  @IsOptional()
  @IsString()
  officePurpose?: string;

  @IsNotEmpty()
  @IsString()
  receipt: string;

  @IsOptional()
  @IsArray()
  proofImages?: string[];

  @IsNotEmpty()
  @IsString()
  date: string;
}

export class UpdateExpenseDto extends PartialType(ExpenseDto) {}
