import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  Matches,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class ContactDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  emailAddress?: string;

  // E.164 phone validation (international). Example: +2348012345678
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  whatsappId?: string;

  @IsOptional()
  @IsNumber()
  groupId?: number;
}

export class UpdateContactDto extends PartialType(ContactDto) {}
