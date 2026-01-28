import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as NodeCache from 'node-cache';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import {
  CloseInvestmentDto,
  SettlementDto,
} from 'src/dtos/investment/investment.dto';

import { FilterDto } from 'src/dtos/filter.dto';
import { NotificationDto } from 'src/dtos/notification.dto';

import { InvestmentClosure } from 'src/schemas/investment/investment-closure.schema';
import { Investment } from 'src/schemas/investment/investment.schema';
import { User } from 'src/schemas/user.schema';

import {
  ActionType,
  NotificationCategory,
  NotificationPriority,
  StateStatus,
  UserRole,
} from 'src/enums';

import { Helpers, Response } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { ProducerService } from 'src/queue/producer.service';

@Injectable()
export class InvestmentClosureService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(InvestmentClosure)
    private readonly closureRepo: Repository<InvestmentClosure>,

    @InjectRepository(Investment)
    private readonly investmentRepo: Repository<Investment>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly queueProducerService: ProducerService,
  ) {}

  // ==================================
  // PRIVATE HELPERS
  // ==================================

  private ensureManagementRole(user: User): boolean {
    return Helpers.getManagementRoles().includes(user.role);
  }

  private buildNotification(
    to: User,
    subject: string,
    category: NotificationCategory,
  ): NotificationDto {
    return {
      from: 0,
      to,
      subject,
      category,
      enableEmail: true,
      enableSMS: true,
      enableInApp: false,
      priority: NotificationPriority.MEDIUM,
    } as NotificationDto;
  }

  private appendHistory(
    investment: Investment,
    payload: any,
    actionBy: User,
    actionType: ActionType,
  ) {
    const entry = {
      ...payload,
      actionType,
      actionDate: new Date(),
      actionBy: actionBy.id,
      actionByUser: actionBy.name,
    };

    if (!investment.updateHistory) investment.updateHistory = [entry];
    else investment.updateHistory.push(entry);
  }

  // ==================================
  // CLOSE INVESTMENT (REFUND)
  // ==================================

  async closeInvestment(
    investmentId: number,
    authenticatedUser: User,
    requestDto: CloseInvestmentDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const investment = await this.investmentRepo.findOne({
        where: { id: investmentId },
      });
      if (!investment) return Response.failure(Messages.InvestmentNotFound);

      if (
        ![
          StateStatus.EXPIRED,
          StateStatus.SETTLED,
          StateStatus.ACTIVE,
        ].includes(investment.status as StateStatus)
      ) {
        return Response.failure(Messages.InvestmentNotEligibleForClosure);
      }

      const client = await this.userRepo.findOne({
        where: { id: investment.clientId },
      });
      if (!client) return Response.failure(Messages.ClientNotFound);

      // Create closure record
      const closure = this.closureRepo.create({
        investmentId: investment.id,
        refundAmount: requestDto.refundAmount,
        refundReceiptUrl: requestDto.refundReceiptUrl,
        remark: requestDto.remark,
        clientId: client.id,
        closedById: authenticatedUser.id,
      });

      const savedClosure = await this.closureRepo.save(closure);

      // Update investment
      investment.status = StateStatus.CLOSED;
      investment.settlementAmount = null;
      investment.settlementReceiptUrl = null;
      investment.settlementRemark = null;

      this.appendHistory(
        investment,
        requestDto,
        authenticatedUser,
        ActionType.DELETE,
      );

      await this.investmentRepo.save(investment);

      const notification = this.buildNotification(
        client,
        'Investment Closed & Refunded',
        NotificationCategory.INVESTMENT_SETTLED,
      );
      await this.queueProducerService.publishNotification(notification);

      return Response.success(savedClosure);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ==================================
  // UPDATE CLOSURE RECORD
  // ==================================

  async updateClosure(
    closureId: number,
    authenticatedUser: User,
    requestDto: CloseInvestmentDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const closure = await this.closureRepo.findOne({
        where: { id: closureId },
      });
      if (!closure) return Response.failure(Messages.InvestmentClosureNotFound);

      const investment = await this.investmentRepo.findOne({
        where: { id: closure.investmentId },
      });
      if (!investment) return Response.failure(Messages.InvestmentNotFound);

      closure.refundAmount = requestDto.refundAmount;
      closure.refundReceiptUrl = requestDto.refundReceiptUrl;
      closure.remark = requestDto.remark;

      await this.closureRepo.save(closure);

      this.appendHistory(
        investment,
        requestDto,
        authenticatedUser,
        ActionType.UPDATE,
      );
      await this.investmentRepo.save(investment);

      return Response.success(closure);
    } catch (ex) {
      return Response.failure(Messages.Exception);
    }
  }

  // ==================================
  // CANCEL CLOSURE
  // ==================================

  async cancelClosure(
    closureId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const closure = await this.closureRepo.findOne({
        where: { id: closureId },
      });
      if (!closure) return Response.failure(Messages.InvestmentClosureNotFound);

      const investment = await this.investmentRepo.findOne({
        where: { id: closure.investmentId },
      });
      if (!investment) return Response.failure(Messages.InvestmentNotFound);

      // Reverse closure
      investment.status = StateStatus.ACTIVE;

      this.appendHistory(
        investment,
        { cancelledClosureId: closureId },
        authenticatedUser,
        ActionType.CANCEL,
      );
      await this.investmentRepo.save(investment);

      await this.closureRepo.delete(closureId);

      return Response.success(Messages.ClosureCancelled);
    } catch (ex) {
      return Response.failure(Messages.Exception);
    }
  }

  // ==================================
  // GET CLOSURE BY ID
  // ==================================

  async getClosureById(
    closureId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      const closure = await this.closureRepo.findOne({
        where: { id: closureId },
        relations: { investment: true, client: true, closedBy: true },
      });
      if (!closure) return Response.failure(Messages.InvestmentClosureNotFound);

      // CLIENT must only see their own
      if (
        authenticatedUser.role === UserRole.CLIENT &&
        closure.clientId !== authenticatedUser.id
      ) {
        return Response.failure(Messages.NoPermission);
      }

      return Response.success(closure);
    } catch (ex) {
      return Response.failure(Messages.Exception);
    }
  }

  // ==================================
  // LIST CLOSURES (ADMIN + CLIENT)
  // ==================================

  async findAllClosures(
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

      let where = Helpers.buildFilteredQuery(filter);

      if (authenticatedUser.role === UserRole.CLIENT) {
        if (Array.isArray(where)) {
          where = where.map((w) => ({ ...w, clientId: authenticatedUser.id }));
        } else {
          where = { ...where, clientId: authenticatedUser.id };
        }
      }

      const [result, count] = await this.closureRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: size * skip,
        relations: { investment: true, client: true, closedBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoClosureFound);

      const totalPages = Math.round(count / size) || (count > 0 ? 1 : 0);

      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages,
      });
    } catch (ex) {
      return Response.failure(Messages.Exception);
    }
  }

  // ==================================
  // SEARCH CLOSURES
  // ==================================

  async searchClosures(
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

      const targetFields = ['remark', 'refundReceiptUrl'];

      let where = Helpers.buildSearchQuery(searchString, targetFields, filter);

      if (authenticatedUser.role === UserRole.CLIENT) {
        if (Array.isArray(where)) {
          where = where.map((w) => ({ ...w, clientId: authenticatedUser.id }));
        } else {
          where = { ...where, clientId: authenticatedUser.id };
        }
      }

      const [result, count] = await this.closureRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { investment: true, client: true, closedBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoClosureFound);

      const totalPages = Math.round(count / size) || (count > 0 ? 1 : 0);

      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages,
      });
    } catch (ex) {
      return Response.failure(Messages.Exception);
    }
  }
}
