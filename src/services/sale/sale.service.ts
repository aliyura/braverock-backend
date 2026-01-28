import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as NodeCache from 'node-cache';
import { Between, In, Repository } from 'typeorm';

import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import {
  ClientDetailsDto,
  SaleApprovalDto,
  SaleByExistingClientDto,
  SaleDto,
  SaleInterestFormDto,
  UpdateSaleDto,
} from 'src/dtos/sale/sale.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { NotificationDto } from 'src/dtos/notification.dto';
import { Payment } from 'src/schemas/sale/payment.schema';
import { Sale } from 'src/schemas/sale/sale.schema';
import { User } from 'src/schemas/user.schema';
import { Reservation } from 'src/schemas/sale/reservation.schema';
import { Estate } from 'src/schemas/property/estate.schema';

import {
  ActionType,
  AuthProvider,
  LocationType,
  NotificationCategory,
  NotificationPriority,
  PaymentMethod,
  PaymentType,
  PropertyType,
  StateStatus,
  UserRole,
} from 'src/enums';

import { ProducerService } from 'src/queue/producer.service';
import { CryptoService } from 'src/services/crypto/crypto.service';
import { Helpers, Response } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { House } from 'src/schemas/property/house.schema';
import { Plot } from 'src/schemas/property/plot.schema';
import { Layout } from 'src/schemas/property/layout.schema';

@Injectable()
export class SaleService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(House)
    private readonly houseRepo: Repository<House>,
    @InjectRepository(Plot)
    private readonly plotRepo: Repository<Plot>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Estate)
    private readonly estateRepo: Repository<Estate>,
    @InjectRepository(Layout)
    private readonly layouteRepo: Repository<Layout>,
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    private readonly queueProducerService: ProducerService,
    private readonly cryptoService: CryptoService,
  ) {}

  // =====================================
  // PRIVATE HELPERS
  // =====================================

  private async getPropertyByType(
    type: PropertyType,
    id: number,
  ): Promise<House | Plot | any> {
    if (type === PropertyType.HOUSE) {
      return this.houseRepo.findOne({
        where: { id },
        relations: { estate: true },
      });
    }

    if (type === PropertyType.PLOT) {
      return this.plotRepo.findOne({
        where: { id },
        relations: { layout: true },
      });
    }

    return null;
  }

  private ensureManagementRole(user: User): boolean {
    return Helpers.getManagementRoles().includes(user.role);
  }

  private buildNotification(
    to: User,
    subject: string,
    category: NotificationCategory,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
  ): NotificationDto {
    return {
      from: 0,
      to,
      subject,
      category,
      enableEmail: true,
      enableSMS: true,
      enableInApp: false,
      priority,
    } as NotificationDto;
  }

  private appendHistory(
    sale: Sale,
    payload: any,
    actionType: ActionType,
    user: User,
  ): void {
    const entry = {
      ...payload,
      actionType,
      actionDate: new Date(),
      actionBy: user.id,
      actionByUser: user.name,
    };

    if (!sale.updateHistory) sale.updateHistory = [entry];
    else sale.updateHistory.push(entry);
  }

  private async createClientAndAttach(
    sale: Sale,
    referrerId?: number,
  ): Promise<User> {
    const password = '1234';
    const hashedPassword = await this.cryptoService.encrypt(password);

    const user = {
      title: sale.title,
      name: sale.name,
      phoneNumber: sale.phoneNumber,
      countryCode: '+234',
      address: sale.residentialAddress,
      emailAddress: sale.emailAddress,
      authProvider: AuthProvider.INTERNAL,
      gender: sale.gender || 'Male',
      password: hashedPassword,
      documents: sale.documents,
      role: UserRole.CLIENT,
      status: StateStatus.ACTIVE,
      referredById: referrerId,

      nextOfKinName: sale.nextOfKinName,
      nextOfKinRelationship: sale.nextOfKinRelationship,
      userType: sale.clientType,
      companyName: sale.companyName,

      // ✅ UPDATED — correct residential fields
      residentialCountry: sale.residentialCountry,
      residentialState: sale.residentialState,
      residentialCity: sale.residentialCity,
      residentialAddress: sale.residentialAddress,

      // origin details
      countryOfOrigin: sale.countryOfOrigin,
      stateOfOrigin: sale.stateOfOrigin,
      lgaOfOrigin: sale.lgaOfOrigin,
      originAddress: sale.originAddress,
    } as unknown as User;

    const savedUser = await this.userRepo.save(user);
    sale.clientId = savedUser.id;
    await this.saleRepo.save(sale);

    const accountNotification = this.buildNotification(
      savedUser,
      'Client Account Created',
      NotificationCategory.NEWACCOUNT,
      NotificationPriority.HIGH,
    );
    await this.queueProducerService.publishNotification(accountNotification);

    return savedUser;
  }

  private async attachAgentInfo(request: Sale, agentId: number): Promise<void> {
    if (!agentId) return;
    const agent = await this.userRepo.findOne({ where: { id: agentId } });
    if (agent) {
      request.agentName = agent.name;
      request.agentPhoneNumber = agent.phoneNumber;
    }
  }

  private async recordInitialPayment(sale: Sale): Promise<void> {
    if (!sale.paidAmount || sale.paidAmount <= 0) return;

    const payment = {
      type:
        sale.paymentMethod === PaymentMethod.FULLPAYMENT
          ? PaymentType.GENERAL
          : PaymentType.PROPERTYFEE,
      amount: sale.paidAmount,
      narration: 'Initial payment',
      paymentMethod: sale.paymentMethod,
      transactionRef: sale.code,
      status: StateStatus.PAID,
      saleId: sale.id,
      clientId: sale.clientId,
      houseId: sale.houseId || null,
      plotId: sale.plotId || null,
    } as unknown as Payment;

    // If full payment & GENERAL, mark all fee components as fully paid
    if (
      payment.type === PaymentType.GENERAL &&
      sale.paidAmount >= sale.totalPayableAmount
    ) {
      sale.infrastructureCostPaid = sale.infrastructureCost;
      sale.facilityFeePaid = sale.facilityFee;
      sale.waterFeePaid = sale.waterFee;
      sale.electricityFeePaid = sale.electricityFee;
      sale.supervisionFeePaid = sale.supervisionFee;
      sale.authorityFeePaid = sale.authorityFee;
      sale.otherFeePaid = sale.otherFee;
      sale.agencyFeePaid = sale.agencyFee;
      await this.saleRepo.save(sale);
    }

    await this.paymentRepo.save(payment);

    const client = await this.userRepo.findOne({
      where: { id: sale.clientId },
    });

    if (client) {
      const paymentNotification = this.buildNotification(
        client,
        'Sale Payment Successful',
        NotificationCategory.SALE_PAYMENT_SUCCESSFUL,
        NotificationPriority.HIGH,
      );
      await this.queueProducerService.publishNotification(paymentNotification);

      // If fully paid, send a completed notification
      if (sale.paidAmount >= sale.totalPayableAmount) {
        const completedNotification = this.buildNotification(
          client,
          'Sale Payment Completed',
          NotificationCategory.SALE_PAYMENT_COMPLETED,
          NotificationPriority.HIGH,
        );
        await this.queueProducerService.publishNotification(
          completedNotification,
        );
      }
    }
  }

  private async extractClientDetails(
    clientId: number,
  ): Promise<ClientDetailsDto | null> {
    const sale = await this.saleRepo.findOne({
      where: { clientId },
    });
    if (!sale) return null;

    return {
      title: sale.title,
      name: sale.name,
      clientType: sale.clientType,
      companyName: sale.companyName,
      rcNumber: sale.rcNumber,
      companyType: sale.companyType,
      tin: sale.tin,
      registeredAddress: sale.registeredAddress,
      website: sale.website,
      designation: sale.designation,
      emailAddress: sale.emailAddress,
      phoneNumber: sale.phoneNumber,
      dob: sale.dob,
      maritalStatus: sale.maritalStatus,
      gender: sale.gender,

      // origin fields
      stateOfOrigin: sale.stateOfOrigin,
      lgaOfOrigin: sale.lgaOfOrigin,
      countryOfOrigin: sale.countryOfOrigin,
      originAddress: sale.originAddress,

      // residential fields
      residentialAddress: sale.residentialAddress,
      residentialState: sale.residentialState,
      residentialCity: sale.residentialCity,
      residentialCountry: sale.residentialCountry,

      employer: sale.employer,
      employmentStatus: sale.employmentStatus,
      employerAddress: sale.employerAddress,
      employerCity: sale.employerCity,
      employerCountry: sale.employerCountry,
      motherMaidenName: sale.motherMaidenName,

      nextOfKinName: sale.nextOfKinName,
      nextOfKinRelationship: sale.nextOfKinRelationship,
      nextOfKinCity: sale.nextOfKinCity,
      nextOfKinResidentialAddress: sale.nextOfKinResidentialAddress,
      nextOfKinTelephone: sale.nextOfKinTelephone,
    };
  }

  // =====================================
  // CORE SALE FLOWS
  // =====================================

  // -------------------------
  // addSale (back-office)
  // -------------------------

  async addSale(
    authenticatedUser: User,
    requestDto: SaleDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser)) {
        return Response.failure(Messages.NoPermission);
      }

      const property = await this.getPropertyByType(
        requestDto.propertyType,
        requestDto.propertyId,
      );
      if (!property) return Response.failure(Messages.PropertyNotFound);

      let reservation = await this.reservationRepo.findOne({
        where: {
          propertyId: requestDto.propertyId,
          propertyType: requestDto.propertyType,
        },
      });

      if (property.status === StateStatus.SOLD) {
        return Response.failure(Messages.PropertyNotAvailableForSale);
      }

      if (property.status === StateStatus.RESERVED) {
        if (!reservation)
          return Response.failure(Messages.ReservationDetailsNotFound);

        if (
          reservation.code !== requestDto.reservationCode ||
          (reservation.emailAddress !== requestDto.emailAddress &&
            reservation.phoneNumber !== requestDto.phoneNumber)
        ) {
          return Response.failure(Messages.PropertyReservedByAnotherClient);
        }
      }

      if (requestDto.reservationCode) {
        reservation = await this.reservationRepo.findOne({
          where: { code: requestDto.reservationCode },
        });

        if (!reservation) {
          return Response.failure(Messages.InvalidReservationCode);
        }

        if (
          reservation.emailAddress !== requestDto.emailAddress &&
          reservation.phoneNumber !== requestDto.phoneNumber
        ) {
          return Response.failure(Messages.PropertyReservedByAnotherUser);
        }
      }

      const agencyFee =
        (Number(property.price) * Number(requestDto.agencyFee)) / 100;

      const totalPayableAmount =
        Number(property.price) +
        requestDto.infrastructureCost +
        requestDto.facilityFee +
        requestDto.waterFee +
        requestDto.electricityFee +
        requestDto.supervisionFee +
        requestDto.authorityFee +
        requestDto.otherFee +
        agencyFee -
        requestDto.discount;

      const saleRequest = {
        ...requestDto,
        transactionRef: Helpers.getTransactionRef(),
        code: Helpers.getCode(),
        createdById: authenticatedUser.id,
        propertyPayable: property.price,
        agencyFee,
        totalPayableAmount,
        propertyPayablePaid:
          requestDto.paymentMethod === PaymentMethod.FULLPAYMENT
            ? property.price
            : requestDto.paidAmount,
        status:
          requestDto.paidAmount > 0 ? StateStatus.ACTIVE : StateStatus.PENDING,
        paymentStatus:
          requestDto.paidAmount >= totalPayableAmount
            ? StateStatus.PAID
            : StateStatus.PAYING,
        propertyPrice: property.price,
        registrationFeesStatus:
          requestDto.paidAmount > 0 ? StateStatus.PAID : StateStatus.UNPAID,
        houseId:
          requestDto.propertyType === PropertyType.HOUSE
            ? requestDto.propertyId
            : null,
        plotId:
          requestDto.propertyType === PropertyType.PLOT
            ? requestDto.propertyId
            : null,
        reservationId: reservation ? reservation.id : null,
      } as unknown as Sale;

      if (
        requestDto.paymentMethod === PaymentMethod.FULLPAYMENT &&
        requestDto.paidAmount >= totalPayableAmount
      ) {
        saleRequest.infrastructureCostPaid = requestDto.infrastructureCost;
        saleRequest.facilityFeePaid = requestDto.facilityFee;
        saleRequest.waterFeePaid = requestDto.waterFee;
        saleRequest.electricityFeePaid = requestDto.electricityFee;
        saleRequest.supervisionFeePaid = requestDto.supervisionFee;
        saleRequest.authorityFeePaid = requestDto.authorityFee;
        saleRequest.otherFeePaid = requestDto.otherFee;
      }

      if (requestDto.reservationCode) delete requestDto.reservationCode;

      await this.attachAgentInfo(saleRequest, requestDto.agentId);

      const sale = await this.saleRepo.save(saleRequest);

      const existingClient = await this.userRepo.findOne({
        where: [
          { phoneNumber: requestDto.phoneNumber },
          { emailAddress: requestDto.emailAddress },
        ],
      });

      if (existingClient) {
        sale.clientId = existingClient.id;
        await this.saleRepo.save(sale);
      } else {
        await this.createClientAndAttach(sale, sale.agentId);

        const client = await this.userRepo.findOne({
          where: { id: sale.clientId },
        });
        if (client) {
          const notification = this.buildNotification(
            client,
            'Purchase Form Created',
            NotificationCategory.SALE_APPLIED,
          );
          await this.queueProducerService.publishNotification(notification);
        }
      }

      // Update property status & counts
      property.status = StateStatus.SOLD;
      property.clientId = sale.clientId;
      property.saleId = sale.id;

      if (requestDto.propertyType === PropertyType.HOUSE) {
        await this.houseRepo.save(property as House);

        const estate = await this.estateRepo.findOne({
          where: { id: property.estateId },
        });
        if (estate) {
          estate.soldHouses = estate.soldHouses + 1;
          await this.estateRepo.save(estate);
        }
      } else {
        await this.plotRepo.save(property as Plot);

        if (property.locationType === LocationType.ESTATE) {
          const estate = await this.estateRepo.findOne({
            where: { id: property.estateId },
          });
          if (estate) {
            estate.soldPlots = estate.soldPlots + 1;
            await this.estateRepo.save(estate);
          }
        }

        if (property.locationType === LocationType.LAYOUT) {
          const layout = await this.layouteRepo.findOne({
            where: { id: property.layoutId },
          });
          if (layout) {
            layout.soldPlots = layout.soldPlots + 1;
            await this.layouteRepo.save(layout);
          }
        }
      }

      if (sale.paidAmount > 0) {
        await this.recordInitialPayment(sale);
      }

      return Response.success(sale);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // -------------------------
  // addPublicSale (public lead)
  // -------------------------

  async addPublicSale(requestDto: SaleInterestFormDto): Promise<ApiResponse> {
    try {
      const property = await this.getPropertyByType(
        requestDto.propertyType,
        requestDto.propertyId,
      );
      if (!property) {
        return Response.failure(Messages.PropertyNotFound);
      }

      if (property.status !== StateStatus.AVAILABLE) {
        return Response.failure(Messages.PropertyNotAvailableForSale);
      }

      const saleRequest = {
        ...requestDto,
        transactionRef: Helpers.getTransactionRef(),
        propertyPayable: property.price,
        code: Helpers.getCode(),
        status: StateStatus.PENDING,
        paymentStatus: StateStatus.UNPAID,
        registrationFeesStatus: StateStatus.PAID,
        houseId:
          requestDto.propertyType === PropertyType.HOUSE
            ? requestDto.propertyId
            : null,
        plotId:
          requestDto.propertyType === PropertyType.PLOT
            ? requestDto.propertyId
            : null,
      } as unknown as Sale;

      const sale = await this.saleRepo.save(saleRequest);

      const tempUser = {
        name: requestDto.name,
        emailAddress: requestDto.emailAddress,
        phoneNumber: requestDto.phoneNumber,
      } as User;

      const notification = this.buildNotification(
        tempUser,
        'Purchase Application Submitted',
        NotificationCategory.SALE_APPLIED,
      );
      await this.queueProducerService.publishNotification(notification);

      return Response.success(sale);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // -------------------------
  // addSaleByExistingClient
  // -------------------------

  async addSaleByExistingClient(
    authenticatedUser: User,
    requestDto: SaleByExistingClientDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser)) {
        return Response.failure(Messages.NoPermission);
      }

      const client = await this.userRepo.findOne({
        where: { id: requestDto.clientId },
      });
      if (!client) return Response.failure(Messages.ClientNotFound);

      const property = await this.getPropertyByType(
        requestDto.propertyType,
        requestDto.propertyId,
      );
      if (!property) return Response.failure(Messages.PropertyNotFound);

      const reservation = await this.reservationRepo.findOne({
        where: {
          propertyId: requestDto.propertyId,
          propertyType: requestDto.propertyType,
        },
      });

      if (property.status === StateStatus.SOLD) {
        return Response.failure(Messages.PropertyNotAvailableForSale);
      }

      if (property.status === StateStatus.RESERVED) {
        if (!reservation)
          return Response.failure(Messages.ReservationDetailsNotFound);

        if (
          reservation.code !== requestDto.reservationCode ||
          (reservation.emailAddress !== client.emailAddress &&
            reservation.phoneNumber !== client.phoneNumber)
        ) {
          return Response.failure(Messages.PropertyReservedByAnotherClient);
        }
      }

      const agencyFee =
        (Number(property.price) * Number(requestDto.agencyFee)) / 100;

      const totalPayableAmount =
        Number(property.price) +
        requestDto.infrastructureCost +
        requestDto.facilityFee +
        requestDto.waterFee +
        requestDto.electricityFee +
        requestDto.supervisionFee +
        requestDto.authorityFee +
        requestDto.otherFee +
        agencyFee -
        requestDto.discount;

      const clientDetails = (await this.extractClientDetails(
        requestDto.clientId,
      )) as ClientDetailsDto;

      if (!clientDetails)
        return Response.failure(Messages.ClintDetailsNotAvailable);

      if (requestDto.reservationCode) delete requestDto.reservationCode;

      const saleRequest = {
        ...clientDetails,
        ...requestDto,
        transactionRef: Helpers.getTransactionRef(),
        code: Helpers.getCode(),
        createdById: authenticatedUser.id,
        propertyPayable: property.price,
        agencyFee,
        totalPayableAmount,
        propertyPayablePaid:
          requestDto.paymentMethod === PaymentMethod.FULLPAYMENT
            ? property.price
            : requestDto.paidAmount,
        status:
          requestDto.paidAmount > 0 ? StateStatus.ACTIVE : StateStatus.PENDING,
        paymentStatus:
          requestDto.paidAmount >= totalPayableAmount
            ? StateStatus.PAID
            : StateStatus.PAYING,
        propertyPrice: property.price,
        registrationFeesStatus:
          requestDto.paidAmount > 0 ? StateStatus.PAID : StateStatus.UNPAID,
        houseId:
          requestDto.propertyType === PropertyType.HOUSE
            ? requestDto.propertyId
            : null,
        plotId:
          requestDto.propertyType === PropertyType.PLOT
            ? requestDto.propertyId
            : null,
        reservationId: reservation ? reservation.id : null,
      } as unknown as Sale;

      if (
        requestDto.paymentMethod === PaymentMethod.FULLPAYMENT &&
        requestDto.paidAmount >= totalPayableAmount
      ) {
        saleRequest.infrastructureCostPaid = requestDto.infrastructureCost;
        saleRequest.facilityFeePaid = requestDto.facilityFee;
        saleRequest.waterFeePaid = requestDto.waterFee;
        saleRequest.electricityFeePaid = requestDto.electricityFee;
        saleRequest.supervisionFeePaid = requestDto.supervisionFee;
        saleRequest.authorityFeePaid = requestDto.authorityFee;
        saleRequest.otherFeePaid = requestDto.otherFee;
      }

      await this.attachAgentInfo(saleRequest, requestDto.agentId);

      const sale = await this.saleRepo.save(saleRequest);

      property.status = StateStatus.SOLD;
      property.clientId = client.id;
      property.saleId = sale.id;

      if (requestDto.propertyType === PropertyType.HOUSE) {
        await this.houseRepo.save(property as House);
      } else {
        await this.plotRepo.save(property as Plot);
      }

      sale.clientId = client.id;
      await this.saleRepo.save(sale);

      const notification = this.buildNotification(
        client,
        'Property Sale Processed',
        NotificationCategory.SALE_APPROVED,
        NotificationPriority.HIGH,
      );
      await this.queueProducerService.publishNotification(notification);

      if (sale.paidAmount > 0) {
        await this.recordInitialPayment(sale);
      }

      return Response.success(sale);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =====================================
  // APPROVAL, UPDATE & DELETE
  // =====================================

  async updateSale(
    saleId: number,
    authenticatedUser: User,
    requestDto: UpdateSaleDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser)) {
        return Response.failure(Messages.NoPermission);
      }

      const sale = await this.saleRepo.findOne({
        where: { id: saleId },
      });
      if (!sale) return Response.failure(Messages.SaleNotAvailable);

      const updateRequest = {
        ...sale,
        ...requestDto,
      } as unknown as Sale;

      this.appendHistory(
        updateRequest,
        requestDto,
        ActionType.UPDATE,
        authenticatedUser,
      );

      await this.saleRepo.update({ id: saleId }, updateRequest);
      const updatedSale = await this.saleRepo.findOne({
        where: { id: saleId },
      });
      return Response.success(updatedSale);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async approveSale(
    saleId: number,
    authenticatedUser: User,
    requestDto: SaleApprovalDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.ensureManagementRole(authenticatedUser)) {
        return Response.failure(Messages.NoPermission);
      }

      const sale = await this.saleRepo.findOne({ where: { id: saleId } });
      if (!sale) return Response.failure(Messages.SaleNotAvailable);

      const property = await this.getPropertyByType(
        sale.propertyType as PropertyType,
        sale.propertyId,
      );
      if (!property) {
        return Response.failure(
          sale.propertyType === PropertyType.HOUSE
            ? Messages.HouseNotFound
            : Messages.PlotNotFound,
        );
      }

      if (sale.status !== StateStatus.PENDING) {
        return Response.failure(Messages.SaleNotInPendingState);
      }

      // Update payment details
      sale.paidAmount = requestDto.paidAmount;
      sale.additionalInformation = requestDto.additionalInformation;
      sale.infrastructureCost = requestDto.infrastructureCost;
      sale.facilityFee = requestDto.facilityFee;
      sale.waterFee = requestDto.waterFee;
      sale.electricityFee = requestDto.electricityFee;
      sale.supervisionFee = requestDto.supervisionFee;
      sale.authorityFee = requestDto.authorityFee;
      sale.otherFee = requestDto.otherFee;

      sale.paymentMethod = requestDto.paymentMethod;
      sale.status = StateStatus.ACTIVE;
      sale.registrationFeesStatus = StateStatus.PAID;
      sale.createdById = authenticatedUser.id;

      const agencyFee =
        (Number(property.price) * Number(requestDto.agencyFee)) / 100;

      sale.totalPayableAmount =
        Number(property.price) +
        requestDto.infrastructureCost +
        requestDto.facilityFee +
        requestDto.waterFee +
        requestDto.electricityFee +
        requestDto.supervisionFee +
        requestDto.authorityFee +
        requestDto.otherFee +
        agencyFee -
        requestDto.discount;

      sale.agencyFee = agencyFee;
      sale.propertyPayable = property.price;
      sale.paymentStatus =
        sale.paidAmount >= sale.totalPayableAmount
          ? StateStatus.PAID
          : StateStatus.PAYING;

      // Attach agent info
      await this.attachAgentInfo(sale, requestDto.agentId);
      sale.agentId = requestDto.agentId;

      await this.saleRepo.save(sale);

      const existingClient = await this.userRepo.findOne({
        where: [
          { phoneNumber: sale.phoneNumber },
          { emailAddress: sale.emailAddress },
        ],
      });
      const client = existingClient
        ? existingClient
        : await this.createClientAndAttach(sale, requestDto.agentId);

      if (client) {
        sale.clientId = client.id;
        await this.saleRepo.save(sale);
        property.clientId = client.id;
      }

      property.status = StateStatus.SOLD;
      property.saleId = sale.id;

      if (sale.propertyType === PropertyType.HOUSE) {
        await this.houseRepo.save(property as House);
      } else {
        await this.plotRepo.save(property as Plot);
      }

      if (sale.paidAmount > 0) {
        await this.recordInitialPayment(sale);
      }

      const approvalNotification = this.buildNotification(
        client,
        'Property Purchase Approved',
        NotificationCategory.SALE_APPROVED,
        NotificationPriority.HIGH,
      );
      await this.queueProducerService.publishNotification(approvalNotification);

      this.appendHistory(
        sale,
        requestDto,
        ActionType.UPDATE,
        authenticatedUser,
      );
      await this.saleRepo.save(sale);

      const updated = await this.saleRepo.findOne({ where: { id: saleId } });
      return Response.success(updated);
    } catch (ex) {
      console.error(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteSale(
    saleId: number,
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

      await this.saleRepo.delete(saleId);
      await this.paymentRepo.delete({ saleId });

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // =====================================
  // QUERYING (GET / LIST / SEARCH)
  // =====================================

  async getSaleById(
    saleId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      const sale = await this.saleRepo.findOne({
        where: { id: saleId },
        relations: {
          createdBy: true,
          house: {
            estate: true,
          },
          plot: { layout: true, estate: true },
          reservation: {
            house: true,
          },
        },
      });

      if (!sale) return Response.failure(Messages.SaleNotAvailable);
      return Response.success(sale);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllSales(
    authenticatedUser: User,
    page: number,
    limit: number,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit && limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page && page > 0 ? Number(page) : 0;

      let where: any = Helpers.buildFilteredQuery(filter);

      if (authenticatedUser.role === UserRole.CLIENT) {
        if (Array.isArray(where)) {
          where = where.map((w) => ({ ...w, clientId: authenticatedUser.id }));
        } else {
          where = { ...where, clientId: authenticatedUser.id };
        }
      }

      if (authenticatedUser.role === UserRole.AGENT) {
        if (Array.isArray(where)) {
          where = where.map((w) => ({ ...w, agentId: authenticatedUser.id }));
        } else {
          where = { ...where, agentId: authenticatedUser.id };
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

      const [result, count] = await this.saleRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: {
          createdBy: true,
          house: {
            estate: true,
          },
          plot: { layout: true, estate: true },
          reservation: {
            house: true,
          },
        },
      });

      if (!result.length) return Response.failure(Messages.NoSaleFound);

      const totalPages = Math.round(count / size) || (count > 0 ? 1 : 0);

      const analytic = {
        sales: await this.saleRepo.count({}),
        total: await this.saleRepo.sum('totalPayableAmount', {
          ...where,
          paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]),
        }),
        totalPaid: await this.saleRepo.sum('paidAmount', {
          ...where,
          paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]),
        }),
        totalUpcoming: await this.saleRepo.sum('totalPayableAmount', {
          ...where,
          status: StateStatus.PENDING,
        }),
        totalOutstanding:
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

  async searchSales(
    authenticatedUser: User,
    page: number,
    limit: number,
    searchString: string,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit && limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page && page > 0 ? Number(page) : 0;

      const targetFields = [
        'title',
        'name',
        'gender',
        'city',
        'description',
        'emailAddress',
        'phoneNumber',
        'stateOfOrigin',
        'employmentStatus',
        'buildingType',
        'house',
        'plot',
        'nextOfKinName',
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

      if (authenticatedUser.role === UserRole.AGENT) {
        if (Array.isArray(where)) {
          where = where.map((w) => ({ ...w, agentId: authenticatedUser.id }));
        } else {
          where = { ...where, agentId: authenticatedUser.id };
        }
      }

      const [result, count] = await this.saleRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: {
          createdBy: true,
          house: {
            estate: true,
          },
          plot: { layout: true, estate: true },
          reservation: {
            house: true,
          },
        },
      });

      if (!result.length) return Response.failure(Messages.NoSaleFound);

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
