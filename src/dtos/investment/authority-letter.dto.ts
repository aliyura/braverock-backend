import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class AuthorityLetterDto {
    @IsOptional()
    @IsNumber()
    investmentId?: number;

    @IsOptional()
    @IsNumber()
    saleId?: number;

    @IsOptional()
    @IsNumber()
    houseId?: number;

    @IsOptional()
    @IsNumber()
    plotId?: number;

    @IsNotEmpty()
    @IsString()
    fileUrl: string;

    @IsOptional()
    @IsString()
    remark?: string;
}

export class UpdateAuthorityLetterDto extends PartialType(AuthorityLetterDto) { }
