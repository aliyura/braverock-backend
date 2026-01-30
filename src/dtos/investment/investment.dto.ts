import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { InvestmentDuration, StateStatus } from 'src/enums';
import { PartialType } from '@nestjs/mapped-types';

export class InvestmentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsEnum(InvestmentDuration)
  duration: InvestmentDuration;

  @IsOptional()
  @IsNumber()
  siteId?: number;

  @IsOptional()
  @IsString()
  description?: string;

  // If existing client selected
  @IsOptional()
  @IsNumber()
  clientId?: number;

  // ============================
  // INVESTOR DETAILS (NEW CLIENT)
  // ============================

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  emailAddress?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  stateOfOrigin?: string;

  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

  @IsOptional()
  @IsString()
  lga?: string;

  // Residential Address
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

  // Government ID
  @IsOptional()
  @IsString()
  governmentIdType?: string;

  @IsOptional()
  @IsString()
  governmentIdNumber?: string;

  @IsOptional()
  @IsString()
  governmentIdUrl?: string;

  @IsOptional()
  @IsString()
  authorityLetterUrl?: string;

  // ============================
  // NEXT OF KIN DETAILS
  // ============================

  @IsOptional()
  @IsString()
  nextOfKinName?: string;

  @IsOptional()
  @IsString()
  nextOfKinPhoneNumber?: string;

  @IsOptional()
  @IsString()
  nextOfKinRelationship?: string;

  @IsOptional()
  @IsString()
  nextOfKinAddress?: string;

  // ============================
  // PAYMENT
  // ============================

  @IsOptional()
  @IsString()
  paymentProofUrl?: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  // ============================
  // LIFE CIRLCE
  // ============================

  @IsNotEmpty()
  @IsString()
  startDate: string;
}

export class UpdateInvestmentDto extends PartialType(InvestmentDto) {
  @IsOptional()
  @IsEnum(StateStatus)
  status?: StateStatus;

  @IsOptional()
  @IsString()
  approvalRemark?: string;
}

export class ApproveInvestmentDto {
  @IsNotEmpty()
  @IsString()
  paymentReceiptUrl: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  startDate: string;
}

export class SettlementDto {
  @IsNotEmpty()
  @IsNumber()
  settlementAmount: number;

  @IsNotEmpty()
  @IsString()
  settlementReceiptUrl: string;

  @IsNotEmpty()
  @IsString()
  remark: string;
}

export class CloseInvestmentDto {
  @IsNotEmpty()
  @IsNumber()
  refundAmount: number; // Amount reversed/refunded to investor

  @IsNotEmpty()
  @IsString()
  refundReceiptUrl: string; // Proof of refund

  @IsNotEmpty()
  @IsString()
  remark: string; // e.g. "Closed due to investor request" or "Refunded after cancellation"
}

export class ExtendDto {
  @IsNotEmpty()
  @IsEnum(InvestmentDuration)
  newDuration: InvestmentDuration;
}
