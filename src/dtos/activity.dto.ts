import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class BillActivityDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;
}

export class ScheduleActivityDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description: string;
}
