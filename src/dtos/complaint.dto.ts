import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { LocationType } from 'src/enums';

export class ComplaintDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  department: string;

  @IsOptional()
  @IsNumber()
  locationId: number;

  @IsOptional()
  @IsEnum(LocationType, { message: 'LocationType must be ESTATE or LAYOUT' })
  locationType: LocationType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}

export class UpdateComplaintDto extends PartialType(ComplaintDto) {
  @IsOptional()
  status: string;
}
