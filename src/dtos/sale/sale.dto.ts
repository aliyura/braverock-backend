import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { PropertyType } from 'src/enums';

export class SaleByExistingClientDto {
  @IsNotEmpty()
  @IsNumber()
  clientId: number;

  @IsNotEmpty()
  @IsNumber()
  propertyId: number;

  @IsNotEmpty()
  @IsEnum(PropertyType, { message: 'propertyType must be HOUSE or PLOT' })
  propertyType: PropertyType;

  @IsOptional()
  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  paymentMode: string;

  @IsOptional()
  @IsString()
  additionalInformation: string;

  @IsOptional()
  @IsNumber()
  agentId: number;

  @IsOptional()
  @IsNumber()
  serialNumber: number;

  @IsOptional()
  @IsNumber()
  paidAmount: number;

  @IsOptional()
  @IsNumber()
  facilityFee: number;

  @IsOptional()
  @IsNumber()
  waterFee: number;

  @IsOptional()
  @IsNumber()
  electricityFee: number;

  @IsOptional()
  @IsNumber()
  supervisionFee: number;

  @IsOptional()
  @IsNumber()
  authorityFee: number;

  @IsOptional()
  @IsNumber()
  otherFee: number;

  @IsOptional()
  @IsNumber()
  discount: number;

  @IsOptional()
  @IsNumber()
  infrastructureCost: number;

  @IsOptional()
  @IsNumber()
  agencyFee: number;

  @IsOptional()
  @IsString()
  narration: string;

  @IsOptional()
  @IsNumber()
  reservationCode: number;

  @IsOptional()
  @IsString()
  paymentReceipt: string;
}

export class SaleApprovalDto {
  @IsOptional()
  @IsString()
  additionalInformation: string;

  @IsOptional()
  @IsNumber()
  paidAmount: number;

  @IsOptional()
  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsNumber()
  agentId: number;

  @IsOptional()
  @IsNumber()
  serialNumber: number;

  @IsOptional()
  @IsNumber()
  agencyFee: number;

  @IsOptional()
  @IsNumber()
  facilityFee: number;

  @IsOptional()
  @IsNumber()
  waterFee: number;

  @IsOptional()
  @IsNumber()
  electricityFee: number;

  @IsOptional()
  @IsNumber()
  supervisionFee: number;

  @IsOptional()
  @IsNumber()
  authorityFee: number;

  @IsOptional()
  @IsNumber()
  otherFee: number;

  @IsOptional()
  @IsNumber()
  discount: number;

  @IsOptional()
  @IsNumber()
  infrastructureCost: number;

  @IsOptional()
  @IsString()
  paymentReceipt: string;
}

export class SalePaymentDto {
  @IsNotEmpty()
  @IsString()
  type: string;
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  transactionRef: string;

  @IsNotEmpty()
  @IsString()
  paymentMethod: string;

  @IsNotEmpty()
  @IsString()
  narration: string;
}

class DocumentDto {
  @IsNotEmpty()
  @IsString()
  documentName: string;

  @IsNotEmpty()
  @IsString()
  fileUrl: string;
}

export class SaleDto {
  @IsNotEmpty()
  @IsString()
  clientType: string;

  @IsOptional()
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  rcNumber: string;

  @IsOptional()
  @IsString()
  companyType: string;

  @IsOptional()
  @IsString()
  tin: string;

  @IsOptional()
  @IsNumber()
  serialNumber: number;

  @IsOptional()
  @IsString()
  registeredAddress: string;

  @IsOptional()
  @IsString()
  website: string;

  @IsOptional()
  @IsString()
  designation: string;

  @IsOptional()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  emailAddress: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  dob: string;

  @IsOptional()
  @IsString()
  maritalStatus: string;

  @IsOptional()
  @IsString()
  gender: string;

  // =============================
  // ORIGIN INFORMATION
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

  @IsNotEmpty()
  @IsString()
  residentialAddress?: string;

  // =============================
  // EMPLOYMENT
  // =============================
  @IsOptional()
  @IsString()
  employer: string;

  @IsOptional()
  @IsString()
  employmentStatus: string;

  @IsOptional()
  @IsString()
  employerAddress: string;

  @IsOptional()
  @IsString()
  employerCity: string;

  @IsOptional()
  @IsString()
  employerCountry: string;

  @IsOptional()
  @IsString()
  motherMaidenName: string;

  // =============================
  // NEXT OF KIN
  // =============================
  @IsOptional()
  @IsString()
  nextOfKinName: string;

  @IsOptional()
  @IsString()
  nextOfKinRelationship: string;

  @IsOptional()
  @IsString()
  nextOfKinCity: string;

  @IsOptional()
  @IsString()
  nextOfKinResidentialAddress: string;

  @IsOptional()
  @IsString()
  nextOfKinTelephone: string;

  // =============================
  // DOCUMENTS
  // =============================
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents?: DocumentDto[];

  // =============================
  // FEES & PAYMENT DATA
  // =============================
  @IsOptional()
  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  paymentMode: string;

  @IsOptional()
  @IsString()
  additionalInformation: string;

  @IsOptional()
  @IsNumber()
  agentId: number;

  @IsOptional()
  @IsNumber()
  paidAmount: number;

  @IsOptional()
  @IsNumber()
  facilityFee: number;

  @IsOptional()
  @IsNumber()
  waterFee: number;

  @IsOptional()
  @IsNumber()
  electricityFee: number;

  @IsOptional()
  @IsNumber()
  supervisionFee: number;

  @IsOptional()
  @IsNumber()
  authorityFee: number;

  @IsOptional()
  @IsNumber()
  otherFee: number;

  @IsOptional()
  @IsNumber()
  discount: number;

  @IsOptional()
  @IsNumber()
  infrastructureCost: number;

  @IsOptional()
  @IsNumber()
  agencyFee: number;

  @IsNotEmpty()
  @IsNumber()
  propertyId: number;

  @IsNotEmpty()
  @IsEnum(PropertyType, { message: 'propertyType must be HOUSE or PLOT' })
  propertyType: PropertyType;

  @IsOptional()
  @IsNumber()
  reservationCode: number;

  @IsOptional()
  @IsString()
  paymentReceipt: string;
}

export class SaleInterestFormDto {
  @IsNotEmpty()
  @IsString()
  clientType: string;

  @IsOptional()
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  rcNumber: string;

  @IsOptional()
  @IsString()
  companyType: string;

  @IsOptional()
  @IsString()
  tin: string;

  @IsOptional()
  @IsString()
  registeredAddress: string;

  @IsOptional()
  @IsString()
  website: string;

  @IsOptional()
  @IsString()
  designation: string;

  @IsOptional()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  emailAddress: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  dob: string;

  @IsOptional()
  @IsString()
  maritalStatus: string;

  @IsOptional()
  @IsString()
  gender: string;

  // ORIGIN INFORMATION
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

  // RESIDENTIAL
  @IsOptional()
  @IsString()
  residentialCountry?: string;

  @IsOptional()
  @IsString()
  residentialState?: string;

  @IsOptional()
  @IsString()
  residentialCity?: string;

  @IsNotEmpty()
  @IsString()
  residentialAddress?: string;

  // EMPLOYMENT
  @IsOptional()
  @IsString()
  employer: string;

  @IsOptional()
  @IsString()
  employmentStatus: string;

  @IsOptional()
  @IsString()
  employerAddress: string;

  @IsOptional()
  @IsString()
  employerCity: string;

  @IsOptional()
  @IsString()
  employerCountry: string;

  @IsOptional()
  @IsString()
  motherMaidenName: string;

  // NEXT OF KIN
  @IsOptional()
  @IsString()
  nextOfKinName: string;

  @IsOptional()
  @IsString()
  nextOfKinRelationship: string;

  @IsOptional()
  @IsString()
  nextOfKinCity: string;

  @IsOptional()
  @IsString()
  nextOfKinResidentialAddress: string;

  @IsOptional()
  @IsString()
  nextOfKinTelephone: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents?: DocumentDto[];

  @IsOptional()
  @IsString()
  paymentMode: string;

  @IsOptional()
  @IsString()
  additionalInformation: string;

  @IsNotEmpty()
  @IsNumber()
  propertyId: number;

  @IsNotEmpty()
  @IsEnum(PropertyType, { message: 'propertyType must be HOUSE or PLOT' })
  propertyType: PropertyType;

  @IsOptional()
  @IsNumber()
  agentId: number;

  @IsOptional()
  @IsNumber()
  serialNumber: number;

  @IsOptional()
  @IsString()
  paymentReceipt: string;
}
export class UpdateSaleDto extends PartialType(SaleDto) { }

export class ClientDetailsDto {
  @IsNotEmpty()
  @IsString()
  clientType: string;

  @IsOptional()
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  rcNumber: string;

  @IsOptional()
  @IsString()
  companyType: string;

  @IsOptional()
  @IsString()
  tin: string;

  @IsOptional()
  @IsString()
  registeredAddress: string;

  @IsOptional()
  @IsString()
  website: string;

  @IsOptional()
  @IsString()
  designation: string;

  @IsOptional()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  emailAddress: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  dob: string;

  @IsOptional()
  @IsString()
  maritalStatus: string;

  @IsOptional()
  @IsString()
  gender: string;

  // ORIGIN INFORMATION
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

  // RESIDENTIAL
  @IsOptional()
  @IsString()
  residentialCountry?: string;

  @IsOptional()
  @IsString()
  residentialState?: string;

  @IsOptional()
  @IsString()
  residentialCity?: string;

  @IsNotEmpty()
  @IsString()
  residentialAddress?: string;

  // EMPLOYMENT
  @IsOptional()
  @IsString()
  employer: string;

  @IsOptional()
  @IsString()
  employmentStatus: string;

  @IsOptional()
  @IsString()
  employerAddress: string;

  @IsOptional()
  @IsString()
  employerCity: string;

  @IsOptional()
  @IsString()
  employerCountry: string;

  @IsOptional()
  @IsString()
  motherMaidenName: string;

  // NEXT OF KIN
  @IsOptional()
  @IsString()
  nextOfKinName: string;

  @IsOptional()
  @IsString()
  nextOfKinRelationship: string;

  @IsOptional()
  @IsString()
  nextOfKinCity: string;

  @IsOptional()
  @IsString()
  nextOfKinResidentialAddress: string;

  @IsOptional()
  @IsString()
  nextOfKinTelephone: string;
}
