import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MessageDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  phoneNumber: string;

  @IsOptional()
  emailAddress: string;

  @IsOptional()
  address: string;

  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  message: string;
}

export class ReplyMessageDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsNotEmpty()
  @IsString()
  subject: string;
}
