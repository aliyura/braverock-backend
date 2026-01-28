import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ApiResponse {
  @IsBoolean() success: boolean;
  @IsString() message: string;
  @IsOptional() payload: any;
}
