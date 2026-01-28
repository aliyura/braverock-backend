import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class NewsDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  audience: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  thumbnail: string;
}

export class UpdateNewsDto extends PartialType(NewsDto) {
  @IsOptional()
  status: string;
}

export class NewsletterDto {
  @IsNotEmpty()
  @IsString()
  emailAddress: string;
}
