import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class AuthorityLetterDto {
    @IsNotEmpty()
    @IsNumber()
    investmentId: number;

    @IsNotEmpty()
    @IsString()
    fileUrl: string;

    @IsOptional()
    @IsString()
    remark?: string;
}

export class UpdateAuthorityLetterDto extends PartialType(AuthorityLetterDto) { }
