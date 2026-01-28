import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { StateStatus } from 'src/enums';

export class QueryLetterDto {
  @IsNotEmpty()
  @IsNumber()
  employeeId: number;

  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  message: string;
}

export class UpdateQueryLetterDto extends PartialType(QueryLetterDto) {
  @IsOptional()
  @IsEnum(StateStatus)
  status: StateStatus;
}
