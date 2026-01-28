import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as NodeCache from 'node-cache';
import { Between, In, Repository } from 'typeorm';

import { Payment } from 'src/schemas/sale/payment.schema';
import { Sale } from 'src/schemas/sale/sale.schema';
import { User } from 'src/schemas/user.schema';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { PaymentDto } from 'src/dtos/sale/payment.dto';
import { NotificationDto } from 'src/dtos/notification.dto';

import {
  ActionType,
  NotificationCategory,
  NotificationPriority,
  PaymentMethod,
  PaymentType,
  StateStatus,
  UserRole,
} from 'src/enums';

import { Helpers, Response } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { ProducerService } from 'src/queue/producer.service';

@Injectable()
export class PaymentService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly queueProducerService: ProducerService,
  ) {}

  // =====================================
  // PRIVATE HELPERS
  // =====================================

  private ensureManagementRole(user: User): boolean {
    return Helpers.getManagementRoles().includes(user.role);
  }

  private buildNotification(
    to: User,
    subject: string,
    category: NotificationCategory,
    context?: any,
  ): NotificationDto {
    return {
      from: 0,
      to,
      subject,
      category,
      context: context,
      enableEmail: true,
      enableSMS: true,
      enableInApp: false,
      priority: NotificationPriority.HIGH,
    } as NotificationDto;
  }

  private appendHistory(
    sale: Sale,
    payload: any,
    user: User,
    actionType: ActionType,
  ): Sale {
    const entry = {
      ...payload,
      actionType,
      actionDate: new Date(),
      actionBy: user.id,
      actionByUser: user.name,
    };

    if (!sale.updateHistory) sale.updateHistory = [entry];
    else sale.updateHistory.push(entry);

    return sale;
  }

  private async getClientForSale(sale: Sale): Promise<User | null> {
    if (sale.clientId) {
      const client = await this.userRepo.findOne({
        where: { id: sale.clientId },
      });
      if (client) return client;
    }

    // fallback to light-weight "User-like" object from sale data
    if (sale.name || sale.emailAddress || sale.phoneNumber) {
      return {
        id: 0,
        name: sale.name,
        emailAddress: sale.emailAddress,
        phoneNumber: sale.phoneNumber,
      } as unknown as User;
    }

    return null;
  }

  /**
   * Auto-detect PaymentType when possible.
   * - If FULLPAYMENT and amount + paid >= total ⇒ GENERAL
   * - Otherwise fallback to GENERAL (unless requestDto.type is provided)
   */
  private inferPaymentType(requestDto: PaymentDto, sale: Sale): PaymentType {
    if (requestDto.type) return requestDto.type as PaymentType;

    const amount = Number(requestDto.amount) || 0;
    const currentPaid = Number(sale.paidAmount) || 0;
    const total = Number(sale.totalPayableAmount) || 0;

    const method = requestDto.paymentMethod || sale.paymentMethod;
    if (
      method === PaymentMethod.FULLPAYMENT &&
      total > 0 &&
      currentPaid + amount >= total
    ) {
      return PaymentType.GENERAL;
    }

    // Default when not explicitly set and we can't infer specifics
    return PaymentType.GENERAL;
  }

  // =====================================
  // ADD PAYMENT
  // =====================================

  async addPayment(
    saleId: number,
    authenticatedUser: User,
    requestDto: PaymentDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser)) {
        return Response.failure(Messages.NoPermission);
      }

      const sale = await this.saleRepo.findOne({
        where: { id: saleId },
      });
      if (!sale) return Response.failure(Messages.SaleNotAvailable);

      const amount = Number(requestDto.amount) || 0;
      const total = Number(sale.totalPayableAmount) || 0;
      const paidSoFar = Number(sale.paidAmount) || 0;

      if (total <= 0) return Response.failure(Messages.SaleAmountIsZero);
      if (total - paidSoFar <= 0)
        return Response.failure(Messages.SaleBalanceIsZero);

      const paymentType = this.inferPaymentType(requestDto, sale);
      const paymentMethod =
        requestDto.paymentMethod || sale.paymentMethod || PaymentMethod.CASH;

      const newPaid = paidSoFar + amount;
      sale.paidAmount = newPaid;

      // ---------------------------------
      // Update fee breakdown based on type
      // ---------------------------------
      switch (paymentType) {
        case PaymentType.PROPERTYFEE:
          sale.propertyPayablePaid =
            Number(sale.propertyPayablePaid || 0) + amount;
          break;
        case PaymentType.FACILITYFEE:
          sale.facilityFeePaid = Number(sale.facilityFeePaid || 0) + amount;
          break;
        case PaymentType.WATERFEE:
          sale.waterFeePaid = Number(sale.waterFeePaid || 0) + amount;
          break;
        case PaymentType.ELECTRICITYFEE:
          sale.electricityFeePaid =
            Number(sale.electricityFeePaid || 0) + amount;
          break;
        case PaymentType.SUPERVISIONFEE:
          sale.supervisionFeePaid =
            Number(sale.supervisionFeePaid || 0) + amount;
          break;
        case PaymentType.AUTHORITYFEE:
          sale.authorityFeePaid = Number(sale.authorityFeePaid || 0) + amount;
          break;
        case PaymentType.OTHERFEE:
          sale.otherFeePaid = Number(sale.otherFeePaid || 0) + amount;
          break;
        case PaymentType.INFRASTRUCTURECOST:
          sale.infrastructureCostPaid =
            Number(sale.infrastructureCostPaid || 0) + amount;
          break;
        case PaymentType.AGENCYFEE:
          sale.agencyFeePaid = Number(sale.agencyFeePaid || 0) + amount;
          break;
        case PaymentType.GENERAL:
        default:
          // If this is a general payment and it fully covers the sale,
          // mark all components as fully paid.
          if (newPaid >= total) {
            sale.infrastructureCostPaid = sale.infrastructureCost;
            sale.facilityFeePaid = sale.facilityFee;
            sale.waterFeePaid = sale.waterFee;
            sale.electricityFeePaid = sale.electricityFee;
            sale.supervisionFeePaid = sale.supervisionFee;
            sale.authorityFeePaid = sale.authorityFee;
            sale.otherFeePaid = sale.otherFee;
            sale.agencyFeePaid = sale.agencyFee;
          }
          break;
      }

      if (newPaid >= total) {
        sale.status = StateStatus.PURCHASED;
        sale.paymentStatus = StateStatus.PAID;
      } else {
        sale.paymentStatus = StateStatus.PAYING;
      }

      const payment = this.paymentRepo.create({
        ...requestDto,
        amount,
        type: paymentType,
        paymentMethod,
        status: StateStatus.PAID,
        saleId: saleId,
        clientId: sale.clientId,
        createdById: authenticatedUser.id,
        plotId: sale.plotId || null,
        houseId: sale.houseId || null,
      } as Payment);

      const savedPayment = await this.paymentRepo.save(payment);

      this.appendHistory(
        sale,
        { ...requestDto, paymentId: savedPayment.id },
        authenticatedUser,
        ActionType.UPDATE,
      );
      await this.saleRepo.save(sale);

      // =========================
      // NOTIFICATION TO CLIENT
      // =========================
      const client = await this.getClientForSale(sale);
      if (client) {
        const category =
          newPaid >= total
            ? NotificationCategory.PAYMENT_COMPLETED
            : NotificationCategory.PAYMENT_RECEIVED;

        const notification = this.buildNotification(
          client,
          'Payment Successful',
          category,
          client,
        );
        await this.queueProducerService.publishNotification(notification);
      }

      return Response.success(savedPayment);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =====================================
  // DELETE PAYMENT
  // =====================================

  async deletePayment(
    paymentId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser)) {
        return Response.failure(Messages.NoPermission);
      }

      const payment = await this.paymentRepo.findOne({
        where: { id: paymentId },
      });
      if (!payment) return Response.failure(Messages.PaymentNotFound);

      const sale = await this.saleRepo.findOne({
        where: { id: payment.saleId },
      });
      if (!sale) return Response.failure(Messages.SaleNotFound);

      const amount = Number(payment.amount) || 0;

      // Reverse allocations based on payment.type
      switch (payment.type) {
        case PaymentType.PROPERTYFEE:
          sale.propertyPayablePaid =
            Number(sale.propertyPayablePaid || 0) - amount;
          break;
        case PaymentType.FACILITYFEE:
          sale.facilityFeePaid = Number(sale.facilityFeePaid || 0) - amount;
          break;
        case PaymentType.WATERFEE:
          sale.waterFeePaid = Number(sale.waterFeePaid || 0) - amount;
          break;
        case PaymentType.ELECTRICITYFEE:
          sale.electricityFeePaid =
            Number(sale.electricityFeePaid || 0) - amount;
          break;
        case PaymentType.SUPERVISIONFEE:
          sale.supervisionFeePaid =
            Number(sale.supervisionFeePaid || 0) - amount;
          break;
        case PaymentType.AUTHORITYFEE:
          sale.authorityFeePaid = Number(sale.authorityFeePaid || 0) - amount;
          break;
        case PaymentType.OTHERFEE:
          sale.otherFeePaid = Number(sale.otherFeePaid || 0) - amount;
          break;
        case PaymentType.INFRASTRUCTURECOST:
          sale.infrastructureCostPaid =
            Number(sale.infrastructureCostPaid || 0) - amount;
          break;
        case PaymentType.AGENCYFEE:
          sale.agencyFeePaid = Number(sale.agencyFeePaid || 0) - amount;
          break;
        case PaymentType.GENERAL:
        default:
          // Reverse full allocation if this payment was a general full-payment
          if (
            payment.type === PaymentType.GENERAL &&
            amount >= (sale.totalPayableAmount || 0)
          ) {
            sale.infrastructureCostPaid =
              Number(sale.infrastructureCostPaid || 0) -
              Number(sale.infrastructureCost || 0);
            sale.facilityFeePaid =
              Number(sale.facilityFeePaid || 0) - Number(sale.facilityFee || 0);
            sale.waterFeePaid =
              Number(sale.waterFeePaid || 0) - Number(sale.waterFee || 0);
            sale.electricityFeePaid =
              Number(sale.electricityFeePaid || 0) -
              Number(sale.electricityFee || 0);
            sale.supervisionFeePaid =
              Number(sale.supervisionFeePaid || 0) -
              Number(sale.supervisionFee || 0);
            sale.authorityFeePaid =
              Number(sale.authorityFeePaid || 0) -
              Number(sale.authorityFee || 0);
            sale.otherFeePaid =
              Number(sale.otherFeePaid || 0) - Number(sale.otherFee || 0);
            sale.agencyFeePaid =
              Number(sale.agencyFeePaid || 0) - Number(sale.agencyFee || 0);
          }
          break;
      }

      sale.paidAmount = Number(sale.paidAmount || 0) - amount;

      // Update payment status flags
      if (sale.paidAmount <= 0) {
        sale.paymentStatus = StateStatus.UNPAID;
        sale.status = StateStatus.PENDING;
      } else if (sale.paidAmount < (sale.totalPayableAmount || 0)) {
        sale.paymentStatus = StateStatus.PAYING;
        if (sale.status === StateStatus.PURCHASED) {
          // You may or may not want to downgrade status; keep as PURCHASED if you prefer
          sale.status = StateStatus.PURCHASED;
        }
      }

      this.appendHistory(
        sale,
        { paymentId, reversedAmount: amount },
        authenticatedUser,
        ActionType.DELETE,
      );

      await this.saleRepo.save(sale);
      await this.paymentRepo.delete(paymentId);

      // Notification: Payment reversed
      const client = await this.getClientForSale(sale);
      if (client) {
        const notification = this.buildNotification(
          client,
          'Payment Reversed',
          NotificationCategory.PAYMENT_REVERSED,
        );
        await this.queueProducerService.publishNotification(notification);
      }

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =====================================
  // LIST PAYMENTS BY SALE ID
  // =====================================

  async findAllPaymentSaleId(
    authenticatedUser: User,
    saleId: number,
    page: number,
    limit: number,
    filterDto: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit && limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page && page > 0 ? Number(page) : 0;

      let where: any = Helpers.buildFilteredQuery(filterDto);

      if (Array.isArray(where)) {
        where = where.map((w) => ({ ...w, saleId }));
      } else {
        where = { ...(where || {}), saleId };
      }

      const [result, count] = await this.paymentRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { sale: true, house: true, plot: true },
      });

      if (!result.length) {
        return Response.failure(Messages.NoPaymentFound);
      }

      const totalPages = Math.round(count / size);
      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages:
          totalPages > 0 ? totalPages : count > 0 && result.length > 0 ? 1 : 0,
      });
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =====================================
  // LIST ALL PAYMENTS (WITH ANALYTICS)
  // =====================================

  async findAllPayments(
    authenticatedUser: User,
    page: number,
    limit: number,
    filterDto: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit && limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page && page > 0 ? Number(page) : 0;

      const where = Helpers.buildFilteredQuery(filterDto);

      const [result, count] = await this.paymentRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { sale: true, house: true, plot: true },
      });

      if (!result.length) {
        return Response.failure(Messages.NoPaymentFound);
      }

      const analytic = {
        received: await this.saleRepo.sum('paidAmount', {
          paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]),
        }),
        outstanding:
          (
            await this.saleRepo
              .createQueryBuilder('sale')
              .select(
                'SUM(sale.totalPayableAmount - sale.paidAmount)',
                'outstanding',
              )
              .where('sale.paymentStatus IN (:...statuses)', {
                statuses: [StateStatus.PAID, StateStatus.PAYING],
              })
              .getRawOne()
          )?.outstanding || 0,
        upcoming: await this.saleRepo.sum('totalPayableAmount', {
          status: StateStatus.PENDING,
        }),
        total: await this.saleRepo.sum('paidAmount', {
          paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]),
        }),
      };

      const totalPages = Math.round(count / size);
      return Response.success({
        analytic,
        page: result,
        size,
        currentPage: skip,
        totalPages:
          totalPages > 0 ? totalPages : count > 0 && result.length > 0 ? 1 : 0,
      });
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =====================================
  // SEARCH PAYMENTS (GLOBAL)
  // =====================================

  async searchPayments(
    authenticatedUser: User,
    page: number,
    limit: number,
    searchString: string,
    filterDto: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit && limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page && page > 0 ? Number(page) : 0;

      const where = Helpers.buildSearchQuery(
        searchString,
        ['transactionRef', 'paymentMethod', 'narration', 'category', 'amount'],
        filterDto,
      );

      const [result, count] = await this.paymentRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { sale: true, house: true, plot: true },
      });

      if (!result.length) {
        return Response.failure(Messages.NoPaymentFound);
      }

      const totalAmount =
        (await this.paymentRepo.sum('amount', where as any)) ?? 0;
      const totalPages = Math.round(count / size);

      return Response.success({
        totalAmount,
        page: result,
        size,
        currentPage: skip,
        totalPages:
          totalPages > 0 ? totalPages : count > 0 && result.length > 0 ? 1 : 0,
      });
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =====================================
  // SEARCH PAYMENTS BY SALE ID
  // =====================================

  async searchPaymentsBySaleId(
    authenticatedUser: User,
    page: number,
    limit: number,
    saleId: number,
    searchString: string,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit && limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page && page > 0 ? Number(page) : 0;

      let where: any = Helpers.buildSearchQuery(
        searchString,
        ['transactionRef', 'paymentMethod', 'narration', 'category', 'amount'],
        filter,
      );

      if (Array.isArray(where)) {
        where = where.map((w) => ({ ...w, saleId }));
      } else {
        where = { ...(where || {}), saleId };
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
      
      const [result, count] = await this.paymentRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { sale: true, house: true, plot: true },
      });

      if (!result.length) {
        return Response.failure(Messages.NoPaymentFound);
      }

      const totalAmount =
        (await this.paymentRepo.sum('amount', where as any)) ?? 0;
      const totalPages = Math.round(count / size);

      return Response.success({
        totalAmount,
        page: result,
        size,
        currentPage: skip,
        totalPages:
          totalPages > 0 ? totalPages : count > 0 && result.length > 0 ? 1 : 0,
      });
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
