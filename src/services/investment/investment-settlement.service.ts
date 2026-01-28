import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as NodeCache from 'node-cache';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { SettlementDto } from 'src/dtos/investment/investment.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { NotificationDto } from 'src/dtos/notification.dto';

import { InvestmentSettlement } from 'src/schemas/investment/investment-settlement.schema';
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
export class InvestmentSettlementService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(InvestmentSettlement)
    private readonly settlementRepo: Repository<InvestmentSettlement>,
    @InjectRepository(Investment)
    private readonly investmentRepo: Repository<Investment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly queueProducerService: ProducerService,
  ) {}

  // =============================
  // PRIVATE HELPERS
  // =============================

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

  // =============================
  // CREATE SETTLEMENT
  // =============================

  async settle(
    investmentId: number,
    authenticatedUser: User,
    requestDto: SettlementDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const investment = await this.investmentRepo.findOne({
        where: { id: investmentId },
      });
      if (!investment) return Response.failure(Messages.InvestmentNotFound);

      if (investment.status !== StateStatus.ACTIVE) {
        return Response.failure(Messages.InvestmentNotInActiveState);
      }

      const client = await this.userRepo.findOne({
        where: { id: investment.clientId },
      });
      if (!client) return Response.failure(Messages.ClientNotFound);

      // Create settlement log
      const settlement = this.settlementRepo.create({
        amountPaid: requestDto.settlementAmount,
        receiptUrl: requestDto.settlementReceiptUrl,
        remark: requestDto.remark,
        investmentId: investment.id,
        clientId: client.id,
        settledById: authenticatedUser.id,
      });

      const savedSettlement = await this.settlementRepo.save(settlement);

      // Update investment
      investment.settlementAmount = requestDto.settlementAmount;
      investment.settlementReceiptUrl = requestDto.settlementReceiptUrl;
      investment.settledAt = new Date();
      investment.settlementRemark = requestDto.remark;
      investment.status = StateStatus.SETTLED;

      this.appendHistory(
        investment,
        requestDto,
        authenticatedUser,
        ActionType.SETTLE,
      );

      await this.investmentRepo.save(investment);

      const notification = this.buildNotification(
        client,
        'Investment Settlement Completed',
        NotificationCategory.INVESTMENT_SETTLED,
      );
      await this.queueProducerService.publishNotification(notification);

      return Response.success(savedSettlement);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =============================
  // UPDATE SETTLEMENT
  // =============================

  async updateSettlement(
    settlementId: number,
    authenticatedUser: User,
    requestDto: SettlementDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const settlement = await this.settlementRepo.findOne({
        where: { id: settlementId },
      });
      if (!settlement) return Response.failure(Messages.SettlementNotFound);

      const investment = await this.investmentRepo.findOne({
        where: { id: settlement.investmentId },
      });
      if (!investment) return Response.failure(Messages.InvestmentNotFound);

      settlement.amountPaid = requestDto.settlementAmount;
      settlement.receiptUrl = requestDto.settlementReceiptUrl;
      settlement.remark = requestDto.remark;

      await this.settlementRepo.save(settlement);

      // Sync investment too
      investment.settlementAmount = requestDto.settlementAmount;
      investment.settlementReceiptUrl = requestDto.settlementReceiptUrl;
      investment.settlementRemark = requestDto.remark;

      this.appendHistory(
        investment,
        requestDto,
        authenticatedUser,
        ActionType.UPDATE,
      );
      await this.investmentRepo.save(investment);

      return Response.success(settlement);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =============================
  // CANCEL SETTLEMENT
  // =============================

  async cancelSettlement(
    settlementId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const settlement = await this.settlementRepo.findOne({
        where: { id: settlementId },
      });
      if (!settlement) return Response.failure(Messages.SettlementNotFound);

      const investment = await this.investmentRepo.findOne({
        where: { id: settlement.investmentId },
      });
      if (!investment) return Response.failure(Messages.InvestmentNotFound);

      // Reverse settlement info
      investment.settlementAmount = null;
      investment.settlementReceiptUrl = null;
      investment.settlementRemark = null;
      investment.settledAt = null;
      investment.status = StateStatus.ACTIVE;

      this.appendHistory(
        investment,
        { cancelledSettlementId: settlementId },
        authenticatedUser,
        ActionType.CANCEL,
      );
      await this.investmentRepo.save(investment);

      await this.settlementRepo.delete(settlementId);

      return Response.success(Messages.SettlementCancelled);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =============================
  // GET BY ID
  // =============================

  async getSettlementById(
    settlementId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      const settlement = await this.settlementRepo.findOne({
        where: { id: settlementId },
        relations: { investment: true, client: true, settledBy: true },
      });
      if (!settlement) return Response.failure(Messages.SettlementNotFound);

      // Clients only allowed to see theirs
      if (
        authenticatedUser.role === UserRole.CLIENT &&
        settlement.clientId !== authenticatedUser.id
      ) {
        return Response.failure(Messages.NoPermission);
      }

      return Response.success(settlement);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =============================
  // LIST SETTLEMENTS (FILTERED)
  // =============================

  async findAllSettlements(
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

      // Clients only see their own settlements
      if (authenticatedUser.role === UserRole.CLIENT) {
        if (Array.isArray(where)) {
          where = where.map((w) => ({ ...w, clientId: authenticatedUser.id }));
        } else {
          where = { ...where, clientId: authenticatedUser.id };
        }
      }

      const [result, count] = await this.settlementRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { investment: true, client: true, settledBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoSettlementFound);

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

  // =============================
  // SEARCH SETTLEMENTS
  // =============================

  async searchSettlements(
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

      const targetFields = ['remark', 'receiptUrl'];

      let where = Helpers.buildSearchQuery(searchString, targetFields, filter);

      if (authenticatedUser.role === UserRole.CLIENT) {
        if (Array.isArray(where)) {
          where = where.map((w) => ({ ...w, clientId: authenticatedUser.id }));
        } else {
          where = { ...where, clientId: authenticatedUser.id };
        }
      }

      const [result, count] = await this.settlementRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { investment: true, client: true, settledBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoSettlementFound);

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
