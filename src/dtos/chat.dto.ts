import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, MessageContentType } from 'src/enums';

export class ChatFileDto {
  @IsString()
  name: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class SenderDto {
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  dp?: string;

  @IsEnum(UserRole)
  role: UserRole;
}

export class RecipientDto {
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  dp?: string;
}

export class SendMessageDto {
  @IsNumber()
  threadId: number;

  @ValidateNested()
  @Type(() => SenderDto)
  sender: SenderDto;

  @ValidateNested()
  @Type(() => RecipientDto)
  recipient: RecipientDto;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatFileDto)
  files?: ChatFileDto[];

  @IsOptional()
  @Type(() => Object)
  reply?: { messageId: number; preview?: string };
}


export class CreateThreadDto {
  @IsNumber()
  userAId: number;

  @IsNumber()
  userBId: number;
}


export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsNumber({}, { each: true })
  participantIds: number[];
}

export class UpdateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}


export class GroupMemberActionDto {
  @IsArray()
  @IsNumber({}, { each: true })
  memberIds: number[];
}

export class ForwardMessageDto {
  @IsNumber()
  messageId: number;

  @IsNumber()
  recipientId: number;
}
