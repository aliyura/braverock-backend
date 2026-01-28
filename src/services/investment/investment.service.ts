import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as NodeCache from 'node-cache';
import { Between, Repository } from 'typeorm';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import {
  InvestmentDto,
  UpdateInvestmentDto,
  ApproveInvestmentDto,
  ExtendDto,
} from 'src/dtos/investment/investment.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { NotificationDto } from 'src/dtos/notification.dto';

import { Investment } from 'src/schemas/investment/investment.schema';
import { User } from 'src/schemas/user.schema';

import {
  ActionType,
  AuthProvider,
  InvestmentDuration,
  NotificationCategory,
  NotificationPriority,
  StateStatus,
  UserRole,
} from 'src/enums';

import { ProducerService } from 'src/queue/producer.service';
import { CryptoService } from 'src/services/crypto/crypto.service';
import { Helpers, Response } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';

@Injectable()
export class InvestmentService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(Investment)
    private readonly investmentRepo: Repository<Investment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly queueProducerService: ProducerService,
    private readonly cryptoService: CryptoService,
  ) {}

  // =============================
  // PRIVATE HELPERS
  // =============================

  private buildNotification(
    to: User,
    subject: string,
    category: NotificationCategory,
    context: any,
  ): NotificationDto {
    return {
      from: 0,
      to,
      context,
      subject,
      category,
      enableEmail: true,
      enableSMS: true,
      enableInApp: false,
      priority: NotificationPriority.MEDIUM,
    } as NotificationDto;
  }

  private calculateExpiryDate(
    duration: InvestmentDuration,
    startDate: Date,
  ): Date {
    const d = new Date(startDate);
    switch (duration) {
      case InvestmentDuration.MONTH:
        d.setMonth(d.getMonth() + 1);
        break;
      case InvestmentDuration.QUARTER:
        d.setMonth(d.getMonth() + 3);
        break;
      case InvestmentDuration.HALF_YEAR:
        d.setMonth(d.getMonth() + 6);
        break;
      case InvestmentDuration.YEAR:
        d.setFullYear(d.getFullYear() + 1);
        break;
      default:
        d.setMonth(d.getMonth() + 1);
    }
    return d;
  }

  private appendHistory(
    investment: Investment,
    payload: any,
    actionType: ActionType,
    user: User,
  ): Investment {
    const history = {
      ...payload,
      actionType,
      actionDate: new Date(),
      actionBy: user.id,
      actionByUser: user.name,
    };

    if (!investment.updateHistory) investment.updateHistory = [history];
    else investment.updateHistory.push(history);

    return investment;
  }

  private ensureManagementRole(user: User): boolean {
    return Helpers.getManagementRoles().includes(user.role);
  }

  private async createClientFromInvestment(
    dto: InvestmentDto,
    createdBy?: User,
  ): Promise<User> {
    const existingClient = await this.userRepo.findOne({
      where: [
        { emailAddress: dto.emailAddress },
        { phoneNumber: dto.phoneNumber },
      ],
    });
    if (existingClient) return existingClient;

    const password = dto.phoneNumber;
    const hashedPassword = await this.cryptoService.encrypt(password);

    const user = {
      name: dto.name,
      emailAddress: dto.emailAddress,
      phoneNumber: dto.phoneNumber,
      dob: dto.dob,
      maritalStatus: dto.maritalStatus,
      gender: dto.gender,
      stateOfOrigin: dto.stateOfOrigin,
      countryOfOrigin: dto.countryOfOrigin,
      lga: dto.lga,
      countryResidence: dto.residentialCountry,
      state: dto.residentialState,
      city: dto.residentialCity,
      residentialAddress: dto.residentialAddress,
      governmentIdType: dto.governmentIdType,
      governmentIdNumber: dto.governmentIdNumber,
      governmentIdUrl: dto.governmentIdUrl,
      nextOfKinName: dto.nextOfKinName,
      nextOfKinTelephone: dto.nextOfKinPhoneNumber,
      nextOfKinRelationship: dto.nextOfKinRelationship,
      nextOfKinResidentialAddress: dto.nextOfKinAddress,
      authProvider: AuthProvider.INTERNAL,
      role: UserRole.CLIENT,
      status: StateStatus.ACTIVE,
      password: hashedPassword,
      createdById: createdBy ? createdBy.id : null,
    } as unknown as User;

    const savedUser = await this.userRepo.save(user);

    const notification = this.buildNotification(
      savedUser,
      'Client Account Created',
      NotificationCategory.NEWACCOUNT,
      savedUser,
    );
    await this.queueProducerService.publishNotification(notification);

    return savedUser;
  }

  // =============================
  // CLIENT: APPLY FOR INVESTMENT
  // =============================

  async applyInvestment(
    authenticatedUser: User,
    requestDto: InvestmentDto,
  ): Promise<ApiResponse> {
    try {
      const client = await this.userRepo.findOne({
        where: { id: authenticatedUser.id },
      });
      if (!client) return Response.failure(Messages.ClientNotFound);

      const now = new Date();
      const startDate = requestDto.startDate
        ? new Date(requestDto.startDate)
        : now;
      const endDate = this.calculateExpiryDate(requestDto.duration, startDate);

      // Client applies for themselves – ignore any passed clientId
      const investment = this.investmentRepo.create({
        title: requestDto.title,
        amount: requestDto.amount,
        duration: requestDto.duration,
        siteId: requestDto.siteId,
        description: requestDto.description,
        status: StateStatus.PENDING,
        clientId: client.id,
        paymentProofUrl: requestDto.paymentProofUrl,
        paymentReference: requestDto.paymentReference,
        createdById: authenticatedUser.id,
        startDate: requestDto.startDate,
        endDate,
      } as unknown as Investment);

      this.appendHistory(
        investment,
        { ...requestDto },
        ActionType.CREATE,
        authenticatedUser,
      );

      const saved = await this.investmentRepo.save(investment);

      const notification = this.buildNotification(
        client,
        'Investment Application Received',
        NotificationCategory.INVESTMENT_APPLIED,
        investment,
      );
      await this.queueProducerService.publishNotification(notification);

      return Response.success(saved);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =============================
  // ADMIN: CREATE INVESTMENT
  // =============================

  async addInvestment(
    authenticatedUser: User,
    requestDto: InvestmentDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser)) {
        return Response.failure(Messages.NoPermission);
      }

      let client: User = null;

      if (requestDto.clientId) {
        client = await this.userRepo.findOne({
          where: { id: requestDto.clientId },
        });
        if (!client) return Response.failure(Messages.ClientNotFound);
      } else {
        if (!requestDto.name || !requestDto.phoneNumber) {
          return Response.failure(Messages.ClientDetailsRequired);
        }
        client = await this.createClientFromInvestment(
          requestDto,
          authenticatedUser,
        );
      }

      const now = new Date();
      const startDate = requestDto.startDate
        ? new Date(requestDto.startDate)
        : now;
      const endDate = this.calculateExpiryDate(requestDto.duration, startDate);

      const investment = this.investmentRepo.create({
        title: requestDto.title,
        amount: requestDto.amount,
        duration: requestDto.duration,
        siteId: requestDto.siteId,
        description: requestDto.description,
        status: StateStatus.ACTIVE,
        clientId: client.id,
        paymentProofUrl: requestDto.paymentProofUrl,
        paymentReference: requestDto.paymentReference,
        createdById: authenticatedUser.id,
        startDate: requestDto.startDate,
        endDate,
      } as unknown as Investment);

      this.appendHistory(
        investment,
        { ...requestDto },
        ActionType.CREATE,
        authenticatedUser,
      );

      const saved = await this.investmentRepo.save(investment);

      const notification = this.buildNotification(
        client,
        'New Investment Created',
        NotificationCategory.INVESTMENT_APPLIED,
        investment,
      );
      await this.queueProducerService.publishNotification(notification);

      return Response.success(saved);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =============================
  // UPDATE INVESTMENT
  // =============================

  async updateInvestment(
    investmentId: number,
    authenticatedUser: User,
    requestDto: UpdateInvestmentDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser)) {
        return Response.failure(Messages.NoPermission);
      }

      const investment = await this.investmentRepo.findOne({
        where: { id: investmentId },
      });
      if (!investment) return Response.failure(Messages.InvestmentNotFound);

      const updateRequest = {
        ...investment,
        ...requestDto,
      } as Investment;

      this.appendHistory(
        updateRequest,
        { ...requestDto },
        ActionType.UPDATE,
        authenticatedUser,
      );

      await this.investmentRepo.update({ id: investmentId }, updateRequest);
      const updated = await this.investmentRepo.findOne({
        where: { id: investmentId },
      });
      return Response.success(updated);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =============================
  // APPROVE INVESTMENT
  // =============================

  async approveInvestment(
    investmentId: number,
    authenticatedUser: User,
    requestDto: ApproveInvestmentDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser)) {
        return Response.failure(Messages.NoPermission);
      }

      const investment = await this.investmentRepo.findOne({
        where: { id: investmentId },
        relations: { client: true },
      });
      if (!investment) return Response.failure(Messages.InvestmentNotFound);

      if (investment.status !== StateStatus.PENDING) {
        return Response.failure(Messages.InvestmentNotInPendingState);
      }

      const client = await this.userRepo.findOne({
        where: { id: investment.clientId },
      });
      if (!client) return Response.failure(Messages.ClientNotFound);

      const now = new Date();
      const startDate = requestDto.paymentDate
        ? new Date(requestDto.paymentDate)
        : now;
      const endDate = this.calculateExpiryDate(investment.duration, startDate);

      investment.paymentReceiptUrl = requestDto.paymentReceiptUrl;
      investment.paymentReference =
        requestDto.paymentReference || investment.paymentReference;
      investment.paymentDate = startDate;
      investment.startDate = startDate;
      investment.endDate = endDate;
      investment.status = StateStatus.ACTIVE;

      this.appendHistory(
        investment,
        { ...requestDto },
        ActionType.UPDATE,
        authenticatedUser,
      );

      const saved = await this.investmentRepo.save(investment);

      const notification = this.buildNotification(
        client,
        'Investment Approved',
        NotificationCategory.INVESTMENT_APPROVED,
        investment,
      );
      await this.queueProducerService.publishNotification(notification);

      return Response.success(saved);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =============================
  // EXTEND INVESTMENT
  // =============================

  async extendInvestment(
    investmentId: number,
    authenticatedUser: User,
    requestDto: ExtendDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser)) {
        return Response.failure(Messages.NoPermission);
      }

      const investment = await this.investmentRepo.findOne({
        where: { id: investmentId },
      });
      if (!investment) return Response.failure(Messages.InvestmentNotFound);

      if (
        ![
          StateStatus.ACTIVE,
          StateStatus.DUE,
          StateStatus.EXPIRED as any,
        ].includes(investment.status)
      ) {
        return Response.failure(Messages.InvestmentCannotBeExtended);
      }

      const now = new Date();
      const baseDate =
        investment.endDate && investment.endDate > now
          ? investment.endDate
          : now;

      const newExpiryDate = this.calculateExpiryDate(
        requestDto.newDuration,
        baseDate,
      );

      investment.endDate = newExpiryDate;
      investment.status = StateStatus.ACTIVE;

      this.appendHistory(
        investment,
        { ...requestDto },
        ActionType.UPDATE,
        authenticatedUser,
      );

      const saved = await this.investmentRepo.save(investment);

      const client = await this.userRepo.findOne({
        where: { id: investment.clientId },
      });
      if (client) {
        const notification = this.buildNotification(
          client,
          'Investment Extended',
          NotificationCategory.INVESTMENT_EXTENDED,
          investment,
        );
        await this.queueProducerService.publishNotification(notification);
      }

      return Response.success(saved);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =============================
  // DELETE INVESTMENT
  // =============================

  async deleteInvestment(
    investmentId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.MANAGER &&
        authenticatedUser.role !== UserRole.CUSTOMERCARE
      ) {
        return Response.failure(Messages.NoPermission);
      }

      const investment = await this.investmentRepo.findOne({
        where: { id: investmentId },
      });
      if (!investment) return Response.failure(Messages.InvestmentNotFound);

      if (
        [
          StateStatus.ACTIVE,
          StateStatus.SETTLED,
          StateStatus.CLOSED,
          StateStatus.CANCELLED as any,
        ].includes(investment.status)
      ) {
        return Response.failure(Messages.InvestmentCannotBeDeleted);
      }

      await this.investmentRepo.delete(investmentId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =============================
  // GET INVESTMENT BY ID
  // =============================

  async getInvestmentById(
    investmentId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      const investment = await this.investmentRepo.findOne({
        where: { id: investmentId },
        relations: { client: true, createdBy: true },
      });
      if (!investment) return Response.failure(Messages.InvestmentNotFound);

      if (
        authenticatedUser.role === UserRole.CLIENT &&
        investment.clientId !== authenticatedUser.id
      ) {
        return Response.failure(Messages.NoPermission);
      }

      return Response.success(investment);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =============================
  // LIST INVESTMENTS (FILTERED)
  // =============================

  async findAllInvestments(
    authenticatedUser: User,
    page: number,
    limit: number,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      let where: any = Helpers.buildFilteredQuery(filter);

      if (authenticatedUser.role === UserRole.CLIENT) {
        if (Array.isArray(where)) {
          where = where.map((w) => ({ ...w, clientId: authenticatedUser.id }));
        } else {
          where = { ...where, clientId: authenticatedUser.id };
        }
      }

      if (filter.from || filter.to) {
        where.createdAt = Between(
          Helpers.formatDate(
            new Date(filter.from ?? Helpers.formatDate(new Date())),
          ),
          Helpers.formatToNextDay(
            new Date(filter.to ?? Helpers.formatDate(new Date())),
          ),
        );
      }

      const [result, count] = await this.investmentRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { client: true, createdBy: true },
      });
      if (!result.length) return Response.failure(Messages.NoInvestmentFound);

      const totalPages = Math.round(count / size) || (count > 0 ? 1 : 0);

      const analytic = {
        total: await this.investmentRepo.count(),
        active: await this.investmentRepo.count({
          where: { status: StateStatus.ACTIVE, ...where },
        }),
        pending: await this.investmentRepo.count({
          where: { status: StateStatus.PENDING, ...where },
        }),
        settled: await this.investmentRepo.count({
          where: { status: StateStatus.SETTLED, ...where },
        }),
        closed: await this.investmentRepo.count({
          where: { status: StateStatus.CLOSED as any, ...where },
        }),
      };

      return Response.success({
        analytic,
        page: result,
        size,
        currentPage: skip,
        totalPages,
      });
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =============================
  // SEARCH INVESTMENTS
  // =============================

  async searchInvestments(
    authenticatedUser: User,
    page: number,
    limit: number,
    searchString: string,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const targetFields = [
        'title',
        'description',
        'paymentReference',
        'status',
      ];

      let where: any = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
      );

      if (authenticatedUser.role === UserRole.CLIENT) {
        if (Array.isArray(where)) {
          where = where.map((w) => ({ ...w, clientId: authenticatedUser.id }));
        } else {
          where = { ...where, clientId: authenticatedUser.id };
        }
      }

      const [result, count] = await this.investmentRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { client: true, createdBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoInvestmentFound);

      const totalPages = Math.round(count / size) || (count > 0 ? 1 : 0);
      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages,
      });
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
