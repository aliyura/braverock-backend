import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { DateAggregationFunction } from 'aws-sdk/clients/quicksight';

export class EmployeeDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  middleName: string;

  @IsNotEmpty()
  @IsEmail()
  emailAddress: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  gender: string;

  @IsNotEmpty()
  @IsDateString()
  dob: DateAggregationFunction;

  @IsNotEmpty()
  @IsString()
  department: string;

  @IsNotEmpty()
  @IsString()
  position: string;

  @IsOptional()
  @IsDateString()
  hireDate: Date;

  @IsOptional()
  @IsString()
  employmentType: string;

  @IsOptional()
  @IsNumber()
  salary: number;

  @IsNotEmpty()
  @IsString()
  maritalStatus: string;

  @IsOptional()
  @IsString()
  emergencyContact: string;

  @IsOptional()
  @IsString()
  governmentIdType: string;

  @IsOptional()
  @IsString()
  governmentIdNumber: string;

  @IsOptional()
  @IsString()
  governmentIdUrl: string;

  // =============================
  // ORIGIN INFORMATION (aligned with User schema)
  // =============================
  @IsOptional()
  @IsString()
  countryOfOrigin: string;

  @IsOptional()
  @IsString()
  stateOfOrigin: string;

  @IsOptional()
  @IsString()
  lgaOfOrigin: string;

  @IsOptional()
  @IsString()
  originAddress: string;

  // =============================
  // RESIDENTIAL INFORMATION
  // =============================
  @IsOptional()
  @IsString()
  residentialCountry?: string;

  @IsOptional()
  @IsString()
  residentialState?: string;

  @IsOptional()
  @IsString()
  residentialCity?: string;

  @IsOptional()
  @IsString()
  residentialAddress?: string;

  // =============================
  // ACCOUNT
  // =============================

  @IsOptional()
  @IsString()
  accountName: string;

  @IsOptional()
  @IsString()
  accountNumber: string;

  @IsOptional()
  @IsString()
  bankName: string;
}

export class UpdateEmployeeDto extends PartialType(EmployeeDto) {
  @IsOptional()
  @IsString()
  status: string;
}
