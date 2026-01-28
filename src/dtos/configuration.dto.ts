import { PartialType } from '@nestjs/mapped-types';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsUrl,
} from 'class-validator';
import { SystemType } from 'src/enums';

export class CreateConfigurationDto {
  @IsNotEmpty()
  @IsString()
  businessName: string;

  @IsNotEmpty()
  @IsEmail()
  businessEmail: string;

  @IsOptional()
  @IsString()
  businessPhone?: string;

  @IsOptional()
  @IsString()
  businessAddress?: string;

  @IsOptional()
  @IsUrl()
  businessWebsite?: string;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  supportPhone?: string;

  @IsNotEmpty()
  @IsEnum(SystemType)
  systemType: SystemType;

  @IsNotEmpty()
  @IsDateString()
  licenseExpiryDate: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsUrl()
  faviconUrl?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;
}
export class UpdateConfigurationDto extends PartialType(
  CreateConfigurationDto,
) {}
