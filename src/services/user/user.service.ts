import { UserStatusChangeDto } from './../../dtos/user.dto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { User } from 'src/schemas/user.schema';
import {
  ResetPasswordDto,
  UpdateUserDto,
  UserAuthDto,
  UserDto,
  ValidateAccountDto,
  VerifyAccountDto,
} from '../../dtos/user.dto';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import {
  ActionType,
  AuthProvider,
  Currency,
  NotificationCategory,
  NotificationPriority,
  StateStatus,
  UserRole,
} from 'src/enums';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { JwtService } from '@nestjs/jwt';
import { In, Like, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CryptoService } from '../crypto/crypto.service';
import { Helpers, Response } from 'src/helpers';
import { FilterDto } from 'src/dtos/filter.dto';
import { NotificationDto } from 'src/dtos/notification.dto';
import { ProducerService } from 'src/queue/producer.service';
import { Account } from 'src/schemas/accounting/account.schema';
import { ChatService } from '../chat/chat.service';
import * as ExcelJS from 'exceljs';
import { validate } from 'class-validator';
import { EmployeeService } from '../hr/employee.service';
import { Employee } from 'src/schemas/hr/employee.schema';

@Injectable()
export class UserService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
    private readonly queueProducerService: ProducerService,
    private readonly chatService: ChatService,
  ) {}

  getDepartmentByRole: Record<string, string> = {
    SUPERADMIN: 'Management',
    ADMIN: 'Management',
    MANAGER: 'Management',
    CUSTOMERCARE: 'Customer Support',
    STOREKEEPER: 'Store / Inventory',
    SITEENGINEER: 'Engineering / Site',
    LEADENGINEER: 'Engineering / Site',
    AGENT: 'Sales & Agency',
    CLIENT: 'Client Services',
    HR: 'Human Resources',
  };

  async addEmployeeFromUser(user: User, createdBy: User) {
    const exists = await this.employeeRepo.findOne({
      where: { emailAddress: user.emailAddress },
    });

    if (exists) return exists;

    const employee = {
      firstName: user.name?.split(' ')[0] || user.name,
      lastName: user.name?.split(' ')[1] || '',
      emailAddress: user.emailAddress,
      phoneNumber: user.phoneNumber,
      gender: user.gender,
      dob: user.dob,
      maritalStatus: user.maritalStatus,
      governmentIdType: user.governmentIdType,
      governmentIdNumber: user.governmentIdNumber,
      governmentIdUrl: user.governmentIdUrl,
      department: this.getDepartmentByRole[user.role] || 'General',
      position: user.role,
      // Origin fields
      stateOfOrigin: user.stateOfOrigin,
      countryOfOrigin: user.countryOfOrigin,
      lgaOfOrigin: user.lgaOfOrigin,
      originAddress: user.originAddress,

      // Residential fields
      residentialCountry: user.residentialCountry,
      residentialState: user.residentialState,
      residentialCity: user.residentialCity,
      residentialAddress: user.residentialAddress,

      status: StateStatus.ACTIVE,
      createdById: createdBy.id,
    } as unknown as Employee;

    return await this.employeeRepo.save(employee);
  }

  async createSuperAdmin(requestDto: UserDto): Promise<ApiResponse> {
    try {
      const alreadyExist = await this.userRepo.exists({
        where: { role: UserRole.SUPERADMIN },
      });
      if (alreadyExist)
        return Response.failure(Messages.SuperAdminAlreadyExist);

      if (requestDto.emailAddress != null && requestDto.emailAddress != '') {
        const alreadyExist = await this.existByEmail(requestDto.emailAddress);
        if (alreadyExist)
          return Response.failure(Messages.UserWithEmailAlreadyExist);
      }

      if (requestDto.phoneNumber != null && requestDto.phoneNumber != '') {
        const alreadyExistWithPhone = await this.existByPhoneNumber(
          requestDto.phoneNumber,
        );
        if (alreadyExistWithPhone)
          return Response.failure(Messages.UserWithPhoneAlreadyExist);
      } else {
        requestDto.phoneNumber = Helpers.getAccountNumber().toString();
      }

      let hash = requestDto.password;
      if (requestDto.authProvider == AuthProvider.INTERNAL) {
        hash = await this.cryptoService.encrypt(requestDto.password);
      } else {
        requestDto.authToken = requestDto.password;
      }
      requestDto.password = hash;

      const request = {
        ...requestDto,
        status: StateStatus.ACTIVE,
        role: UserRole.SUPERADMIN,
      } as unknown as User;

      const user = await this.userRepo.save(request);
      if (user) {
        const accountOpeningRequest = {
          balance: 0,
          currency: Currency.NGN,
          description: `Account opened`,
          accountName: requestDto.accountName || null,
          accountNumber: requestDto.accountNumber || null,
          bankName: requestDto.bankName || null,
          userId: user.id,
        } as unknown as Account;

        const openedAccount = await this.accountRepo.save(
          accountOpeningRequest,
        );
        if (openedAccount) {
          user.accountId = openedAccount.id;
          await this.userRepo.save(user);
        }

        // await this.chatService.onboardUserToChat(user);
        return Response.success(user);
      } else {
        return Response.failure('Unable to create account');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async clientSignup(requestDto: UserDto): Promise<ApiResponse> {
    try {
      const alreadyExist = await this.userRepo.exists({
        where: { role: UserRole.SUPERADMIN },
      });
      if (alreadyExist)
        return Response.failure(Messages.SuperAdminAlreadyExist);

      if (requestDto.emailAddress != null && requestDto.emailAddress != '') {
        const alreadyExist = await this.existByEmail(requestDto.emailAddress);
        if (alreadyExist)
          return Response.failure(Messages.UserWithEmailAlreadyExist);
      }

      if (requestDto.phoneNumber != null && requestDto.phoneNumber != '') {
        const alreadyExistWithPhone = await this.existByPhoneNumber(
          requestDto.phoneNumber,
        );
        if (alreadyExistWithPhone)
          return Response.failure(Messages.UserWithPhoneAlreadyExist);
      } else {
        requestDto.phoneNumber = Helpers.getAccountNumber().toString();
      }

      let hash = requestDto.password;
      if (requestDto.authProvider == AuthProvider.INTERNAL) {
        hash = await this.cryptoService.encrypt(requestDto.password);
      } else {
        requestDto.authToken = requestDto.password;
      }
      requestDto.password = hash;

      const request = {
        ...requestDto,
        status: StateStatus.ACTIVE,
        role: UserRole.CLIENT,
      } as unknown as User;

      const user = await this.userRepo.save(request);
      if (user) {
        const verificationOTP = Helpers.getCode();
        this.cache.set(user.emailAddress, verificationOTP);
        this.cache.set(user.phoneNumber, verificationOTP);

        if (user.phoneNumber.toString().startsWith('0')) {
          if (user.countryCode != null)
            user.phoneNumber = `${user.countryCode.trim()}${user.phoneNumber.substring(1)}`;
        } else {
          if (user.countryCode != null)
            user.phoneNumber = `${user.countryCode.trim()}${user.phoneNumber}`;
        }

        //send otp to the user;
        const notification = {
          from: 0,
          to: user,
          subject: Messages.OTPSubject,
          body: `${Messages.OTPMessage} ${verificationOTP}`,
          category: NotificationCategory.OTP,
          enableEmail: true,
          enableSMS: true,
          enableInApp: false,
          priority: NotificationPriority.HIGH,
        } as unknown as NotificationDto;

        this.queueProducerService.publishNotification(notification);
        // await this.chatService.onboardUserToChat(user);

        return Response.success(user);
      } else {
        return Response.failure('Unable to register your account');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async createAdmin(
    authenticatedUser: User,
    requestDto: UserDto,
  ): Promise<ApiResponse> {
    try {
      if (!Helpers.getManagementRoles().includes(authenticatedUser.role))
        return Response.failure(Messages.NoPermission);

      if (requestDto.emailAddress != null && requestDto.emailAddress != '') {
        const alreadyExist = await this.existByEmail(requestDto.emailAddress);
        if (alreadyExist)
          return Response.failure(Messages.UserWithEmailAlreadyExist);
      }

      if (requestDto.phoneNumber != null && requestDto.phoneNumber != '') {
        const alreadyExistWithPhone = await this.existByPhoneNumber(
          requestDto.phoneNumber,
        );
        if (alreadyExistWithPhone)
          return Response.failure(Messages.UserWithPhoneAlreadyExist);
      } else {
        requestDto.phoneNumber = Helpers.getAccountNumber().toString();
      }

      let hash = requestDto.password;
      if (requestDto.authProvider == AuthProvider.INTERNAL) {
        hash = await this.cryptoService.encrypt(requestDto.password);
      } else {
        requestDto.authToken = requestDto.password;
      }
      requestDto.password = hash;

      const request = {
        ...requestDto,
        status: StateStatus.ACTIVE,
        role: UserRole.ADMIN,
      } as unknown as User;

      const user = await this.userRepo.save(request);
      if (user) {
        const accountOpeningRequest = {
          balance: 0,
          currency: Currency.NGN,
          description: `Account opened by ${authenticatedUser.name} on ${new Date().toISOString()}`,
          accountName: requestDto.accountName || null,
          accountNumber: requestDto.accountNumber || null,
          bankName: requestDto.bankName || null,
          userId: user.id,
        } as unknown as Account;

        const openedAccount = await this.accountRepo.save(
          accountOpeningRequest,
        );
        if (openedAccount) {
          user.accountId = openedAccount.id;
          await this.userRepo.save(user);
        }

        // await this.chatService.onboardUserToChat(user);

        return Response.success(user);
      } else {
        return Response.failure('Unable to create your account');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async createUser(
    authenticatedUser: User,
    requestDto: UserDto,
  ): Promise<ApiResponse> {
    try {
      if (!Helpers.getManagementRoles().includes(authenticatedUser.role))
        return Response.failure(Messages.NoPermission);

      // Validate email & phone
      if (requestDto.emailAddress) {
        if (await this.existByEmail(requestDto.emailAddress))
          return Response.failure(Messages.UserWithEmailAlreadyExist);
      }

      if (requestDto.phoneNumber) {
        if (await this.existByPhoneNumber(requestDto.phoneNumber))
          return Response.failure(Messages.UserWithPhoneAlreadyExist);
      } else {
        requestDto.phoneNumber = Helpers.getAccountNumber().toString();
      }

      // Prepare password
      let hash = requestDto.password;
      if (requestDto.authProvider == AuthProvider.INTERNAL) {
        hash = await this.cryptoService.encrypt(requestDto.password);
      } else {
        requestDto.authToken = requestDto.password;
      }

      const originalPassword = requestDto.password;
      requestDto.password = hash;

      // Create user record
      const request = {
        ...requestDto,
        status: StateStatus.ACTIVE,
        createdById: authenticatedUser.id,
      } as unknown as User;

      const user = await this.userRepo.save(request);

      if (user) {
        // Create account
        const accountOpeningRequest = {
          balance: 0,
          currency: Currency.NGN,
          description: `Account opened by ${authenticatedUser.name} on ${new Date().toISOString()}`,
          accountName: requestDto.accountName || null,
          accountNumber: requestDto.accountNumber || null,
          bankName: requestDto.bankName || null,
          userId: user.id,
        } as Account;

        const openedAccount = await this.accountRepo.save(
          accountOpeningRequest,
        );
        if (openedAccount) {
          user.accountId = openedAccount.id;
          await this.userRepo.save(user);
        }

        if (user.role !== UserRole.CLIENT) {
          await this.addEmployeeFromUser(user, authenticatedUser);
        }

        const notification: NotificationDto = {
          from: 0,
          to: user,
          context: user,
          subject: 'Welcome to Our Platform',
          category: NotificationCategory.NEWACCOUNT,
          enableEmail: true,
          enableSMS: true,
          enableInApp: false,
          priority: NotificationPriority.MEDIUM,
        } as NotificationDto;

        await this.queueProducerService.publishNotification(notification);

        return Response.success(user);
      } else {
        return Response.failure('Unable to create your account');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async bulkUploadUsers(
    fileBuffer: Buffer,
    role: string,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const worksheet = workbook.worksheets[0];

      const headerRow = worksheet.getRow(1);
      const headerMap: Record<string, number> = {};

      headerRow.eachCell((cell, colNumber) => {
        if (cell.value) {
          const header = String(cell.value).trim().toLowerCase();
          headerMap[header] = colNumber;
        }
      });

      const get = (row: ExcelJS.Row, field: string) => {
        const col = headerMap[field.toLowerCase()];
        if (!col) return '';
        const cell = row.getCell(col);
        const val = cell?.value;
        if (val == null) return '';
        if (typeof val === 'object') {
          if ('text' in val) return val.text;
          if ('richText' in val)
            return val.richText.map((r) => r.text).join('');
          if ('formula' in val) return val.result;
          return '';
        }
        return val;
      };

      // ===== Prepare containers =====
      const usersToCreate: User[] = [];
      const errors: any[] = [];

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (!row || row.number === 1) continue;

        const dto = new UserDto();
        dto.name = String(get(row, 'name') || '').trim();
        dto.title = String(get(row, 'title') || '').trim();
        dto.phoneNumber = String(get(row, 'phoneNumber') || '').trim();
        dto.countryCode = String(get(row, 'countryCode') || '').trim();
        dto.stateOfOrigin = String(get(row, 'stateOfOrigin') || '').trim();
        dto.countryOfOrigin = String(get(row, 'countryOfOrigin') || '').trim();
        dto.lgaOfOrigin = String(get(row, 'lgaOfOrigin') || '').trim();
        dto.originAddress = String(get(row, 'originAddress') || '').trim();

        dto.residentialCountry = String(
          get(row, 'residentialCountry') || '',
        ).trim();
        dto.residentialState = String(
          get(row, 'residentialState') || '',
        ).trim();
        dto.residentialCity = String(get(row, 'residentialCity') || '').trim();
        dto.residentialAddress = String(
          get(row, 'residentialAddress') || '',
        ).trim();
        dto.emailAddress = String(get(row, 'emailAddress') || '').trim();
        dto.authProvider = String(get(row, 'authProvider') || 'local').trim();
        dto.gender = String(get(row, 'gender') || '').trim();
        dto.role = role ? role : 'CLIENT';
        dto.accountName = String(get(row, 'accountName') || '').trim();
        dto.accountNumber = String(get(row, 'accountNumber') || '').trim();
        dto.bankName = String(get(row, 'bankName') || '').trim();
        dto.dob = String(get(row, 'dob') || '').trim();
        dto.nextOfKinName = String(get(row, 'nextOfKinName') || '').trim();
        dto.nextOfKinRelationship = String(
          get(row, 'nextOfKinRelationship') || '',
        ).trim();
        dto.maritalStatus = String(get(row, 'maritalStatus') || '').trim();

        //hash password
        const hash = await this.cryptoService.encrypt(dto.phoneNumber);
        dto.password = hash;

        if (dto.emailAddress != null && dto.emailAddress != '') {
          const alreadyExist = await this.existByEmail(dto.emailAddress);
          if (alreadyExist) {
            errors.push({
              row: i,
              data: dto,
              errors: Messages.UserWithPhoneAlreadyExist,
            });
            continue;
          }
        }

        if (dto.phoneNumber != null && dto.phoneNumber != '') {
          const alreadyExistWithPhone = await this.existByPhoneNumber(
            dto.phoneNumber,
          );
          if (alreadyExistWithPhone) {
            errors.push({
              row: i,
              data: dto,
              errors: Messages.UserWithEmailAlreadyExist,
            });
            continue;
          }
        }

        // ===== Validate DTO =====
        const validationErrors = await validate(dto);
        if (validationErrors.length > 0) {
          errors.push({
            row: i,
            errors: validationErrors
              .map((e) => Object.values(e.constraints || {}))
              .flat(),
          });
          continue;
        }

        const request: Partial<User> = {
          ...dto,
          createdById: authenticatedUser.id,
        };

        usersToCreate.push(request as User);
      }

      // ===== Save =====
      const created = await this.userRepo.save(usersToCreate);

      // ===== Send Welcome Notifications =====
      if (created.length > 0) {
        const appName = process.env.APP_NAME || 'Realta';
        const appUrl = process.env.APP_URL || 'https://braverock365.com';

        for (const user of created) {
          if (user.role !== UserRole.CLIENT) {
            await this.addEmployeeFromUser(user, authenticatedUser);
          }

          const notification = {
            from: 0,
            to: user,
            subject: `Welcome to ${appName}`,
            body: `An account has been created for you at ${appName}'. Your default password is ${user.phoneNumber}. Download  ${appName}'s app or visit ${appUrl} to log in.`,
            category: NotificationCategory.NEWACCOUNT,
            enableEmail: true,
            enableSMS: true,
            enableInApp: false,
            priority: NotificationPriority.HIGH,
          } as unknown as NotificationDto;

          this.queueProducerService.publishNotification(notification);
        }
      }

      if (created.length > 0) {
        if (errors.length > 0)
          return Response.fail('Some users failed to upload', {
            createdCount: created.length,
            failedCount: errors.length,
            failedRows: errors,
          });

        return Response.success({
          createdCount: created.length,
          failedCount: errors.length,
          failedRows: errors,
        });
      } else {
        return Response.fail('No user records processed', {
          createdCount: created.length,
          failedCount: errors.length,
          failedRows: errors,
        });
      }
    } catch (ex) {
      console.log(ex);
      return Response.failure('Error while processing file');
    }
  }

  async updateUserStatus(
    authenticatedUser: User,
    userId: number,
    requestDto: UserStatusChangeDto,
  ) {
    try {
      const userResponse = await this.findByUserId(userId);
      if (userResponse.success) {
        const currentUser = userResponse.payload;

        if (!Helpers.getManagementRoles().includes(authenticatedUser.role)) {
          return Response.failure(Messages.NoPermission);
        }

        if (requestDto.statusReason && requestDto.statusReason != '')
          currentUser.statusReason = requestDto.statusReason;

        if (requestDto.statusRemark && requestDto.statusRemark != '')
          currentUser.statusRemark = requestDto.statusRemark;

        if (requestDto.status) currentUser.status = requestDto.status;

        currentUser.updatedAt = new Date();

        const updateHistory = {
          ...requestDto,
          actionType: ActionType.UPDATE,
          actionDate: new Date(),
          actionBy: authenticatedUser.id,
          actionByUser: authenticatedUser.name,
        };

        if (currentUser.updateHistory == null)
          currentUser.updateHistory = [updateHistory];
        else currentUser.updateHistory.push(updateHistory);

        if (
          requestDto.status == StateStatus.ACTIVE ||
          requestDto.status == StateStatus.INACTIVE ||
          requestDto.status == StateStatus.SUSPENDED
        ) {
          var statusReason = `Account Status Changed to ${requestDto.status}`;
          var statusChangeRemark = `Your account status has been modified by ${process.env.APP_NAME || 'Realta'}`;

          if (requestDto.status == StateStatus.SUSPENDED) {
            statusReason = `Account Suspension`;
            statusChangeRemark = `Your account with name ${currentUser.name} has been suspended on ${process.env.APP_NAME || 'Realta'}. ${requestDto.statusReason ? `Suspension reason: ${requestDto.statusRemark}` : ''}`;
          }
          if (requestDto.status == StateStatus.INACTIVE) {
            statusReason = `Account Deactivation`;
            statusChangeRemark = `Your account with name ${currentUser.name} has been deactivated on ${process.env.APP_NAME || 'Realta'}. ${requestDto.statusReason ? `Reason: ${requestDto.statusRemark}` : ''}`;
          }
          if (requestDto.status == StateStatus.ACTIVE) {
            statusReason = `Account Activation`;
            statusChangeRemark = `Congratulations! Your account with name ${currentUser.name} has been activated on ${process.env.APP_NAME || 'Realta'}. You can now login to ${process.env.APP_NAME || 'Realta'}.`;
          }

          const notification = {
            from: 0,
            to: currentUser,
            subject: statusReason,
            body: statusChangeRemark,
            category: NotificationCategory.STATUSCHANGE,
            date: new Date(),
            enableEmail: true,
            enableSMS: true,
            enableInApp: false,
            priority: NotificationPriority.HIGH,
          } as unknown as NotificationDto;

          this.queueProducerService.publishNotification(notification);
          const updatedUser = await this.userRepo.save(currentUser);

          return Response.success(updatedUser);
        } else {
          return Response.failure(
            `Unable to update status to ${currentUser.status}`,
          );
        }
      } else {
        return Response.failure(Messages.UserNotFound);
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateUser(
    authenticatedUser: User,
    userId: number,
    requestDto: UpdateUserDto,
  ): Promise<any> {
    try {
      const userResponse = await this.findByUserId(userId);
      if (userResponse.success) {
        const currentUser = userResponse.payload as User;

        if (
          !Helpers.getManagementRoles().includes(authenticatedUser.role) &&
          authenticatedUser.id !== userId
        ) {
          return Response.failure(Messages.NoPermission);
        }

        if (
          requestDto.emailAddress &&
          requestDto.emailAddress != currentUser.emailAddress &&
          requestDto.emailAddress != authenticatedUser.emailAddress
        ) {
          const existingUser = await this.userRepo.findOne({
            where: { emailAddress: requestDto.emailAddress },
          });

          if (existingUser) {
            if (!Helpers.getManagementRoles().includes(existingUser.role))
              return Response.failure(Messages.UserWithEmailAlreadyExist);
          }
        }

        if (
          requestDto.phoneNumber &&
          requestDto.phoneNumber &&
          currentUser.phoneNumber &&
          requestDto.phoneNumber != authenticatedUser.phoneNumber
        ) {
          const existingUser = await this.userRepo.findOne({
            where: { phoneNumber: requestDto.phoneNumber },
          });

          if (existingUser) {
            if (!Helpers.getManagementRoles().includes(existingUser.role))
              return Response.failure(Messages.UserWithPhoneAlreadyExist);
          }
        }

        const request = {
          ...currentUser,
          ...requestDto,
        };

        const updateHistory = {
          ...requestDto,
          actionType: ActionType.UPDATE,
          actionDate: new Date(),
          actionBy: authenticatedUser.id,
          actionByUser: authenticatedUser.name,
        };

        if (request.updateHistory == null)
          request.updateHistory = [updateHistory];
        else request.updateHistory.push(updateHistory);

        const updatedUser = await this.userRepo.save(request);
        return Response.success(updatedUser);
      } else {
        return Response.failure(Messages.UserNotFound);
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteUser(authenticatedUser: User, userId: number): Promise<any> {
    try {
      if (!Helpers.getManagementRoles().includes(authenticatedUser.role))
        return Response.failure(Messages.NoPermission);

      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) return Response.failure(Messages.UserNotFound);

      const deletion = `_deleted${Helpers.getCode()}`;
      user.status = StateStatus.DELETED;
      user.emailAddress = `${user.emailAddress}${deletion}`;
      user.phoneNumber = `${user.phoneNumber}${deletion}`;
      user.notificationToken = null;

      const updateHistory = {
        actionType: ActionType.DELETE,
        actionDate: new Date(),
        actionBy: authenticatedUser.id,
        actionByUser: authenticatedUser.name,
      };

      if (user.updateHistory == null) user.updateHistory = [updateHistory];
      else user.updateHistory.push(updateHistory);

      await this.userRepo.save(user);
      return Response.success('User deleted successfully');
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async validateAccount(requestDto: ValidateAccountDto): Promise<ApiResponse> {
    try {
      const res = await this.findByUser(requestDto.identity);
      if (res && res.success) {
        const user = res.payload as User;
        const verificationOTP = Helpers.getCode();
        await this.cache.set(requestDto.identity, verificationOTP);

        if (user.phoneNumber.toString().startsWith('0')) {
          if (user.countryCode != null)
            user.phoneNumber = `${user.countryCode.trim()}${user.phoneNumber.substring(1)}`;
        } else {
          if (user.countryCode != null)
            user.phoneNumber = `${user.countryCode.trim()}${user.phoneNumber}`;
        }

        //send otp to the user;
        const notification = {
          from: 0,
          to: user,
          subject: Messages.OTPSubject,
          body: `${Messages.OTPMessage} ${verificationOTP}`,
          category: NotificationCategory.OTP,
          enableEmail: true,
          enableSMS: true,
          enableInApp: false,
          priority: NotificationPriority.HIGH,
        } as unknown as NotificationDto;

        this.queueProducerService.publishNotification(notification);

        return Response.success(Messages.OTPSent);
      } else {
        return Response.failure(Messages.UserNotFound);
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async verifyAccount(requestDto: VerifyAccountDto): Promise<ApiResponse> {
    try {
      const res = await this.findByUser(requestDto.identity);
      if (res && res.success) {
        const user = res.payload;
        const userOtp = requestDto.otp;
        const systemOtp = await this.cache.get(requestDto.identity); //stored OTP in memory
        if (userOtp == systemOtp) {
          const update = { ...user, status: StateStatus.ACTIVE };
          await this.userRepo.save(update);

          const updatedUser = await this.userRepo.findOne({
            where: { id: res.payload.id },
          });

          await this.cache.set(requestDto.identity, 'verified');
          return Response.success(updatedUser);
        } else {
          return Response.failure('Invalid OTP or expired');
        }
      } else {
        return Response.failure(Messages.UserNotFound);
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async validateIdentity(requestDto: ValidateAccountDto): Promise<ApiResponse> {
    try {
      const res = await this.findByUser(requestDto.identity);
      if (res && res.success)
        return Response.failure(Messages.UserAlreadyExist);

      const verificationOTP = Helpers.getCode();
      this.cache.set(requestDto.identity, verificationOTP); //set sms otp

      const notification = {
        from: 0,
        to: requestDto as unknown as User,
        subject: Messages.OTPSubject,
        body: `${Messages.OTPMessage} ${verificationOTP}`,
        category: NotificationCategory.OTP,
        enableEmail: true,
        enableSMS: true,
        enableInApp: false,
        priority: NotificationPriority.HIGH,
      } as unknown as NotificationDto;

      this.queueProducerService.publishNotification(notification);

      return Response.success(Messages.OTPSent);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async verifyIdentity(requestDto: VerifyAccountDto): Promise<ApiResponse> {
    try {
      const userOtp = requestDto.otp;
      const systemOtp = await this.cache.get(requestDto.identity); //stored OTP in memory
      if (userOtp == systemOtp) {
        await this.cache.set(requestDto.identity, 'verified');
        return Response.success(Messages.AccountVerified);
      } else {
        return Response.failure('Invalid OTP or expired');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async resetPassword(requestDto: ResetPasswordDto): Promise<ApiResponse> {
    try {
      const res = await this.findByUser(requestDto.identity);
      if (res && res.success) {
        const currentUser = res.payload;
        const verificationStateStatus = await this.cache.get(
          requestDto.identity,
        ); //stored OTP in memory

        if (verificationStateStatus === 'verified') {
          const hashedPassword = await this.cryptoService.encrypt(
            requestDto.newPassword,
          );
          requestDto.newPassword = hashedPassword;

          const updateHistory = {
            ...requestDto,
            actionType: ActionType.PASSWORDCHANGE,
            actionDate: new Date(),
            actionBy: currentUser.id,
            actionByUser: currentUser.name,
          };

          if (currentUser.updateHistory == null)
            currentUser.updateHistory = [updateHistory];
          else currentUser.updateHistory.push(updateHistory);

          currentUser.password = hashedPassword;
          currentUser.updatedAt = new Date();

          const updatedUser = await this.userRepo.save(currentUser);
          delete updatedUser.password;
          delete updatedUser.updateHistory;

          return Response.success(updatedUser);
        } else {
          return Response.failure(Messages.InvalidOtp);
        }
      } else {
        return Response.failure(Messages.UserNotFound);
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async authenticatedUserByToken(authToken: string): Promise<ApiResponse> {
    try {
      const user = (await this.jwtService.decode(authToken)) as UserAuthDto;
      if (user) {
        const response = await this.findByUser(user.username);
        if (response.success) {
          const user = response.payload as User;

          user.lastLoginAt = new Date();
          this.userRepo.save(user);

          if (user.status === StateStatus.ACTIVE) {
            return Response.success(user);
          } else {
            delete user.password;
            delete user.updateHistory;
            return Response.fail(
              `Your account is ${user.status.toLowerCase()}`,
              user,
            );
          }
        }
      }
      return Response.failure(Messages.UserNotFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async authenticatePublicRequestByToken(
    authToken: string,
  ): Promise<ApiResponse> {
    try {
      const sysToken = process.env.APP_PUBLIC_AUTH_SECRETKEY;
      if (sysToken != authToken)
        return Response.send(
          HttpStatus.UNAUTHORIZED,
          Messages.NoPermissionToResources,
        );

      return Response.success('Authenticated successfully');
    } catch (ex) {
      console.log('Error:', ex);
      return Response.send(
        HttpStatus.UNAUTHORIZED,
        Messages.NoPermissionToResources,
      );
    }
  }

  async findUserByEmail(emailAddress: string): Promise<ApiResponse> {
    try {
      const result = await this.userRepo.findOne({
        where: { emailAddress },
        relations: { createdBy: true },
      });
      if (result) {
        return Response.success(result);
      }
      return Response.failure(Messages.UserNotFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findSuperAdmin(): Promise<ApiResponse> {
    try {
      const result = await this.userRepo.findOne({
        where: { role: UserRole.SUPERADMIN },
      });
      if (result) {
        return Response.success(result);
      }
      return Response.failure(Messages.UserNotFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findUserByToken(authToken: string): Promise<ApiResponse> {
    try {
      const user = (await this.jwtService.decode(authToken)) as UserAuthDto;
      const result = await this.findUserByEmail(user.username);
      if (result.success) {
        return Response.success(user);
      }
      return Response.failure(Messages.UserNotFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
  async findByUserId(userId: number): Promise<ApiResponse> {
    try {
      const response = await this.userRepo.findOne({
        where: { id: userId },
        relations: { createdBy: true },
      });
      if (response) return Response.success(response);

      return Response.failure(Messages.UserNotFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
  async findByPhoneNumber(phoneNumber: string): Promise<ApiResponse> {
    try {
      const response = await this.userRepo.findOne({
        where: { phoneNumber },
        relations: { createdBy: true },
      });

      if (response) return Response.success(response);

      return Response.failure(Messages.UserNotFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findByPhoneNumberOrEmailAddress(
    phoneNumber: string,
    emailAddress: string,
  ): Promise<ApiResponse> {
    try {
      const response = await this.userRepo.findOne({
        where: [{ phoneNumber: phoneNumber }, { emailAddress: emailAddress }],
        relations: { createdBy: true },
      });

      if (response) return Response.success(response);

      return Response.failure(Messages.UserNotFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findByUser(request: string): Promise<ApiResponse> {
    try {
      const response = await this.userRepo.findOne({
        where: [{ phoneNumber: request }, { emailAddress: request }],
        relations: { createdBy: true },
      });

      if (response) return Response.success(response);

      return Response.failure(Messages.UserNotFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findByUserByUniqueKey(
    id: number,
    emailAddress: string,
    phoneNumber: string,
  ): Promise<ApiResponse> {
    try {
      const userDetail = await this.userRepo.findOne({
        where: [{ id }, { emailAddress }, { phoneNumber }],
        relations: { createdBy: true },
      });

      if (userDetail) {
        delete userDetail.password;
        delete userDetail.updateHistory;

        return Response.success(userDetail);
      }
      return Response.failure(Messages.UserNotFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async existByPhoneNumber(phoneNumber: string): Promise<boolean> {
    try {
      const response = await this.userRepo.findOne({
        where: { phoneNumber },
        relations: { createdBy: true },
      });
      if (response) return true;
      return false;
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return false;
    }
  }

  async existByEmail(emailAddress: string): Promise<boolean> {
    try {
      const response = await this.userRepo.findOne({
        where: { emailAddress },
        relations: { createdBy: true },
      });
      if (response) return true;
      return false;
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return false;
    }
  }

  async findAllUsers(
    authenticatedUser: User,
    page: number,
    limit: number,
    filterDto: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const query = { role: Not(UserRole.CLIENT) } as any;
      if (authenticatedUser.role == UserRole.SUPERADMIN)
        query.id = Not(authenticatedUser.id);

      if (filterDto.role) query.role = filterDto.role;
      if (filterDto.status) query.status = filterDto.status;
      if (filterDto.gender) query.gender = filterDto.gender;

      if (authenticatedUser.role == UserRole.AGENT)
        query.referredById = authenticatedUser.id;

      //if not agent and management, no one can view clients
      if (
        query.role == UserRole.CLIENT &&
        authenticatedUser.role != UserRole.AGENT
      ) {
        if (!Helpers.getManagementRoles().includes(authenticatedUser.role))
          return Response.failure(Messages.NoPermission);
      }

      const [result, count] = await this.userRepo
        .createQueryBuilder()
        .where(query)
        .skip(skip * size)
        .take(size)
        .orderBy('createdAt', 'DESC')
        .getManyAndCount();

      if (result.length) {
        const analytic = {
          clients: await this.userRepo.count({
            where: { role: UserRole.CLIENT },
          }),
          engineers: await this.userRepo.count({
            where: { role: In([UserRole.SITEENGINEER, UserRole.LEADENGINEER]) },
          }),
          agents: await this.userRepo.count({
            where: { role: UserRole.AGENT },
          }),
          others: await this.userRepo.count({
            where: {
              role: Not(
                In([
                  UserRole.CLIENT,
                  UserRole.AGENT,
                  UserRole.SITEENGINEER,
                  UserRole.LEADENGINEER,
                  UserRole.SITEENGINEER,
                ]),
              ),
            },
          }),
        };

        const totalPages = Math.round(count / size);
        return Response.success({
          analytic,
          page: result,
          size: size,
          currentPage: Number(skip),
          totalPages:
            totalPages > 0
              ? totalPages
              : count > 0 && result.length > 0
                ? 1
                : 0,
        });
      }
      return Response.failure(Messages.NoUserFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchUsers(
    authenticatedUser: User,
    page: number,
    limit: number,
    filterDto: FilterDto,
    searchString: string,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const requiredQuery = { ole: Not(UserRole.CLIENT) } as any;
      if (authenticatedUser.role == UserRole.SUPERADMIN)
        requiredQuery.id = Not(authenticatedUser.id);

      if (filterDto.gender) requiredQuery.gender = filterDto.gender;
      if (filterDto.role) requiredQuery.role = filterDto.role;
      if (filterDto.status) requiredQuery.status = filterDto.status;

      const optonalQuery = [] as any;
      if (searchString) {
        optonalQuery.push({ name: Like(`%${searchString}%`) });
        optonalQuery.push({ phoneNumber: Like(`%${searchString}%`) });
        optonalQuery.push({ emailAddress: Like(`%${searchString}%`) });
        optonalQuery.push({ gender: Like(`%${searchString}%`) });
        optonalQuery.push({ residentialAddress: Like(`%${searchString}%`) });
        optonalQuery.push({ residentialCity: Like(`%${searchString}%`) });
        optonalQuery.push({ residentialState: Like(`%${searchString}%`) });
        optonalQuery.push({ originAddress: Like(`%${searchString}%`) });
        optonalQuery.push({ stateOfOrigin: Like(`%${searchString}%`) });
        optonalQuery.push({ lgaOfOrigin: Like(`%${searchString}%`) });
      }

      const [result, count] = await this.userRepo
        .createQueryBuilder()
        .where(requiredQuery)
        .andWhere(optonalQuery)
        .take(size)
        .skip(skip * size)
        .orderBy('createdAt', 'DESC')
        .getManyAndCount();

      if (result.length) {
        const totalPages = Math.round(count / size);

        return Response.success({
          page: result,
          size: size,
          currentPage: Number(skip),
          totalPages:
            totalPages > 0
              ? totalPages
              : count > 0 && result.length > 0
                ? 1
                : 0,
        });
      }
      return Response.failure(Messages.NoUserFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
