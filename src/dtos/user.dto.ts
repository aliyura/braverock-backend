import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class UserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  notificationToken: string;

  @IsOptional()
  @IsString()
  notificationDeviceType: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  countryCode: string;

  // =============================
  // ORIGIN INFORMATION (Matches schema)
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
  residentialCountry: string;

  @IsOptional()
  @IsString()
  residentialState: string;

  @IsOptional()
  @IsString()
  residentialCity: string;

  @IsOptional()
  @IsString()
  residentialAddress: string;

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

  // =============================
  // CONTACT & ACCOUNT
  // =============================

  @IsNotEmpty()
  @IsEmail()
  emailAddress: string;

  @IsNotEmpty()
  @IsString()
  authProvider: string;

  @IsOptional()
  @IsString()
  authToken: string;

  // =============================
  // PERSONAL INFORMATION
  // =============================

  @IsOptional()
  @IsString()
  dob: string;

  @IsNotEmpty()
  @IsString()
  gender: string;

  @IsOptional()
  @IsString()
  maritalStatus: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  role: string;

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
  nextOfKinPhoneNumber: string;

  @IsOptional()
  @IsString()
  nextOfKinAddress: string;

  @IsOptional()
  @IsString()
  governmentIdType: string;

  @IsOptional()
  @IsString()
  governmentIdNumber: string;

  @IsOptional()
  @IsString()
  governmentIdUrl: string;
}

export class UpdateUserDto extends PartialType(UserDto) {
  @IsOptional()
  status: string;

  @IsOptional()
  dp: string;
}

export class UserStatusChangeDto {
  @IsNotEmpty()
  status: string;

  @IsNotEmpty()
  statusReason: string;

  @IsOptional()
  statusRemark: string;
}

export class UserAuthDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  password: string;

  @IsOptional()
  authProvider: string;
}
export class ValidateAccountDto {
  @IsNotEmpty() @IsString() identity: string;
}
export class VerifyAccountDto {
  @IsNotEmpty() @IsString() identity: string;
  @IsNotEmpty() @IsString() otp: string;
}
export class ResetPasswordDto {
  @IsNotEmpty() @IsString() identity: string;
  @IsNotEmpty() @IsString() newPassword: string;
}
