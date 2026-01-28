import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FilePropsDto {
  @IsOptional() folder: string;
  @IsOptional() parentId: number;
  @IsOptional() name: string;
}

export class FileDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsOptional() mimeType: string;
  @IsOptional() parentId?: number;
}
