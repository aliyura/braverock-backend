import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class IncidentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  attachements: any[];
}

export class UpdateIncidentDto extends PartialType(IncidentDto) {
  @IsOptional()
  @IsString()
  status?: string;
}
