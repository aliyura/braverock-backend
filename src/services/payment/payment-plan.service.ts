import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as NodeCache from 'node-cache';
import { Repository } from 'typeorm';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import {
  PaymentPlanDto,
  UpdatePaymentPlanDto,
  CancelPaymentPlanDto,
} from 'src/dtos/sale/payment-plan.dto';

import { FilterDto } from 'src/dtos/filter.dto';
import { NotificationDto } from 'src/dtos/notification.dto';
import { Sale } from 'src/schemas/sale/sale.schema';
import { User } from 'src/schemas/user.schema';

import {
  ActionType,
  NotificationCategory,
  NotificationPriority,
  PaymentFrequency,
  StateStatus,
  UserRole,
} from 'src/enums';

import { ProducerService } from 'src/queue/producer.service';
import { Helpers, Response } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { PaymentPlan } from 'src/schemas/sale/payment-plan.schema';

@Injectable()
export class PaymentPlanService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(PaymentPlan)
    private readonly planRepo: Repository<PaymentPlan>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly queueProducerService: ProducerService,
  ) {}

  // =========================================
  // PRIVATE HELPERS
  // =========================================

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
    } as unknown as NotificationDto;
  }

  private ensureManagementRole(user: User): boolean {
    return Helpers.getManagementRoles().includes(user.role);
  }

  private appendHistory(
    plan: PaymentPlan,
    payload: any,
    actionType: ActionType,
    user: User,
  ): PaymentPlan {
    const history = {
      ...payload,
      actionType,
      actionDate: new Date(),
      actionBy: user.id,
      actionByUser: user.name,
    };

    if (!plan.updateHistory) plan.updateHistory = [history];
    else plan.updateHistory.push(history);

    return plan;
  }

  private getNextScheduledDate(
    frequency: PaymentFrequency,
    refDate: Date,
  ): string {
    const d = new Date(refDate);

    switch (frequency) {
      case PaymentFrequency.WEEKLY:
        d.setDate(d.getDate() + 7);
        break;
      case PaymentFrequency.MONTHLY:
        d.setMonth(d.getMonth() + 1);
        break;
      case PaymentFrequency.QUARTERLY:
        d.setMonth(d.getMonth() + 3);
        break;
      case PaymentFrequency.YEARLY:
        d.setFullYear(d.getFullYear() + 1);
        break;
      case PaymentFrequency.CUSTOM:
        return refDate.toISOString().split('T')[0];
      default:
        d.setMonth(d.getMonth() + 1);
    }

    return d.toISOString().split('T')[0];
  }

  // =========================================
  // CREATE PAYMENT PLAN
  // =========================================

  async createPaymentPlan(
    authenticatedUser: User,
    requestDto: PaymentPlanDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser)) {
        return Response.failure(Messages.NoPermission);
      }

      const sale = await this.saleRepo.findOne({
        where: { id: requestDto.saleId },
      });
      if (!sale) return Response.failure(Messages.SaleNotFound);

      const client = await this.userRepo.findOne({
        where: { id: sale.clientId },
      });
      if (!client) return Response.failure(Messages.ClientNotFound);

      const startDate = new Date(requestDto.startDate);
      const nextDate =
        requestDto.nextPaymentDate ||
        this.getNextScheduledDate(requestDto.frequency, startDate);

      const plan = this.planRepo.create({
        ...requestDto,
        clientId: sale.clientId,
        nextPaymentDate: nextDate,
        status: StateStatus.ACTIVE,
        createdById: authenticatedUser.id,
      } as PaymentPlan);

      this.appendHistory(
        plan,
        { ...requestDto },
        ActionType.CREATE,
        authenticatedUser,
      );

      const savedPlan = await this.planRepo.save(plan);

      sale.paymentPlanId = savedPlan.id;
      await this.saleRepo.save(sale);

      const notification = this.buildNotification(
        client,
        'New Payment Plan Created',
        NotificationCategory.PAYMENT_PLAN_CREATED,
      );
      await this.queueProducerService.publishNotification(notification);

      return Response.success(savedPlan);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =========================================
  // UPDATE PAYMENT PLAN
  // =========================================

  async updatePaymentPlan(
    id: number,
    authenticatedUser: User,
    requestDto: UpdatePaymentPlanDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser)) {
        return Response.failure(Messages.NoPermission);
      }

      const plan = await this.planRepo.findOne({ where: { id } });
      if (!plan) return Response.failure(Messages.PaymentPlanNotFound);

      const updatedPlan = { ...plan, ...requestDto } as PaymentPlan;

      this.appendHistory(
        updatedPlan,
        { ...requestDto },
        ActionType.UPDATE,
        authenticatedUser,
      );

      await this.planRepo.update({ id }, updatedPlan);
      const saved = await this.planRepo.findOne({ where: { id } });

      return Response.success(saved);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =========================================
  // CANCEL PAYMENT PLAN
  // =========================================

  async cancelPaymentPlan(
    id: number,
    authenticatedUser: User,
    requestDto: CancelPaymentPlanDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser)) {
        return Response.failure(Messages.NoPermission);
      }

      const plan = await this.planRepo.findOne({
        where: { id },
        relations: { client: true },
      });
      if (!plan) return Response.failure(Messages.PaymentPlanNotFound);

      plan.status = StateStatus.CANCELLED;

      this.appendHistory(
        plan,
        { ...requestDto },
        ActionType.UPDATE,
        authenticatedUser,
      );

      await this.planRepo.save(plan);

      const notification: NotificationDto = {
        from: 0,
        to: plan.client,
        context: plan,
        subject: 'Payment Plan Created',
        category: NotificationCategory.PAYMENT_PLAN_CREATED,
        enableEmail: true,
        enableSMS: true,
        enableInApp: false,
        priority: NotificationPriority.MEDIUM,
      } as NotificationDto;

      await this.queueProducerService.publishNotification(notification);

      return Response.success(Messages.UpdatedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =========================================
  // GET PAYMENT PLAN BY ID
  // =========================================

  async getPaymentPlanById(
    id: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      const plan = await this.planRepo.findOne({
        where: { id },
        relations: { sale: true, client: true, createdBy: true },
      });
      if (!plan) return Response.failure(Messages.PaymentPlanNotFound);

      if (
        authenticatedUser.role === UserRole.CLIENT &&
        plan.clientId !== authenticatedUser.id
      ) {
        return Response.failure(Messages.NoPermission);
      }

      return Response.success(plan);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =========================================
  // LIST PAYMENT PLANS (GENERAL)
  // =========================================

  async findAllPaymentPlans(
    authenticatedUser: User,
    page: number,
    limit: number,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size = limit > 0 ? Number(limit) : 15;
      const skip = page > 0 ? Number(page) : 0;

      let where: any = Helpers.buildFilteredQuery(filter);

      if (authenticatedUser.role === UserRole.CLIENT) {
        where = { ...where, clientId: authenticatedUser.id };
      }

      const [result, count] = await this.planRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { client: true, sale: true, createdBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoPaymentPlanFound);

      const totalPages = Math.round(count / size) || 1;

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

  // =========================================
  // LIST PAYMENT PLANS BY SALE
  // =========================================

  async getPaymentPlansBySale(
    saleId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      const sale = await this.saleRepo.findOne({ where: { id: saleId } });
      if (!sale) return Response.failure(Messages.SaleNotFound);

      const plans = await this.planRepo.find({
        where: { saleId },
        order: { createdAt: 'DESC' },
        relations: { client: true, createdBy: true },
      });

      return Response.success(plans);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =========================================
  // SEARCH PAYMENT PLANS
  // =========================================

  async searchPaymentPlans(
    authenticatedUser: User,
    page: number,
    limit: number,
    searchString: string,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size = limit > 0 ? Number(limit) : 15;
      const skip = page > 0 ? Number(page) : 0;

      const targetFields = ['planName', 'status'];

      let where: any = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
      );

      if (authenticatedUser.role === UserRole.CLIENT) {
        where = { ...where, clientId: authenticatedUser.id };
      }

      const [result, count] = await this.planRepo.findAndCount({
        where,
        take: size,
        skip: skip * size,
        order: { createdAt: 'DESC' },
        relations: { client: true, sale: true, createdBy: true },
      });

      if (!result.length) return Response.failure(Messages.NoPaymentPlanFound);

      const totalPages = Math.round(count / size) || 1;

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
