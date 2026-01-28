import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class ProjectExpenseAnalysisDto {
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  amountAnalyzed: number;

  @IsNotEmpty()
  @IsString()
  projectName: string;

  @IsOptional()
  @IsObject()
  buckets: Record<string, number>;
}

export class UpdateProjectExpenseAnalysisDto extends PartialType(
  ProjectExpenseAnalysisDto,
) {}
