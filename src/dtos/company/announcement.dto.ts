import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class AnnouncementDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  audience: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  actionURL: string;

  @IsOptional()
  @IsString()
  actionText: string;
}

export class UpdateAnnouncementDto extends PartialType(AnnouncementDto) {
  @IsOptional()
  status: string;
}
