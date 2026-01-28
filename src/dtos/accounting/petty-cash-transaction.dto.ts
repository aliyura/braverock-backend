import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { PettyCashDirection } from 'src/enums';

export class PettyCashDto {
  @IsNotEmpty()
  @IsEnum(PettyCashDirection)
  direction: PettyCashDirection;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  runningBalance: number;

  @IsOptional()
  @IsString()
  periodLabel: string;
}

export class UpdatePettyCashDto extends PartialType(
  PettyCashDto,
) {}
