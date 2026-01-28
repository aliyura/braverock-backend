import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ArrayUnique,
  IsInt,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class ContactGroupDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  contactIds?: number[]; // initial members
}

export class UpdateContactGroupDto extends PartialType(ContactGroupDto) {}

export class ContactToGroupDto {
  @IsNotEmpty()
  @IsNumber()
  groupId: number;

  @IsNotEmpty()
  @IsNumber()
  contactId: number;
}
