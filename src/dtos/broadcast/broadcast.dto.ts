import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  IsInt,
  ArrayUnique,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { Channel, UserRole } from 'src/enums';

export class NewBroadcastDto {
  @IsNotEmpty()
  @IsEnum(Channel)
  channel: Channel;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  message: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  contactIds?: number[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  groupIds?: number[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];
}
export class UpdateBroadcastDto extends PartialType(NewBroadcastDto) {}
