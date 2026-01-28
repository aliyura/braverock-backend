import { IsOptional } from 'class-validator';

export class FilterDto {
  @IsOptional()
  gender: string;

  @IsOptional()
  status: string;

  @IsOptional()
  createdById: number;

  @IsOptional()
  role: string;

  @IsOptional()
  stock: string;

  @IsOptional()
  groupId: number;

  @IsOptional()
  broadcastId: number;

  @IsOptional()
  type: string;

  @IsOptional()
  saleId: number;

  @IsOptional()
  channel: number;

  @IsOptional()
  targetType: string;

  @IsOptional()
  category: string;

  @IsOptional()
  residentialCountry?: string;

  @IsOptional()
  residentialState?: string;

  @IsOptional()
  residentialCity?: string;

  @IsOptional()
  residentialAddress?: string;

  @IsOptional()
  parent: number;

  @IsOptional()
  prefferedEstate: string;

  @IsOptional()
  emailAddress: string;

  @IsOptional()
  phoneNumber: string;

  @IsOptional()
  stateOfOrigin: string;

  @IsOptional()
  employer: string;

  @IsOptional()
  employmentStatus: string;

  @IsOptional()
  buildingType: string;

  @IsOptional()
  nextOfKinName: string;

  @IsOptional()
  from: string;

  @IsOptional()
  to: string;

  @IsOptional()
  supplyStatus: string;

  @IsOptional()
  estateId: number;

  @IsOptional()
  layoutId: number;

  @IsOptional()
  agentId: number;

  @IsOptional()
  clientId: number;

  @IsOptional()
  userId: number;

  @IsOptional()
  allocationStatus: string;

  @IsOptional()
  paymentStatus: string;
}
