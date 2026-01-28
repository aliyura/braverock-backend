import { IsArray, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ScheduleActivityDto } from './activity.dto';

export class ScheduleDto {
  @IsNotEmpty()
  @IsNumber()
  estateId: number;

  @IsNotEmpty()
  @IsArray()
  activities: ScheduleActivityDto[];
}

export class UpdateScheduleDto extends PartialType(ScheduleDto) {
  @IsOptional()
  status: string;
}
