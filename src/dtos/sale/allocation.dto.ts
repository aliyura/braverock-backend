import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class AllocationDto {
  @IsNotEmpty()
  @IsNumber()
  saleId: number;

  @IsNotEmpty()
  @IsString()
  allocationLetter: string;

  @IsOptional()
  @IsString()
  remark: string;
}
export class UpdateAllocationDto extends PartialType(AllocationDto) {}
