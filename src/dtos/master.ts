import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PropertyVisibility } from 'src/enums';

export class UpdateStatusDto {
  @IsNotEmpty()
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  amount: number;

  @IsOptional()
  @IsString()
  statusReason?: string;
}
