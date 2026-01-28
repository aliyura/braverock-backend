import { Reservation } from '../../schemas/sale/reservation.schema';
import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Helpers, Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import {
  ActionType,
  NotificationCategory,
  NotificationPriority,
  PropertyType,
  StateStatus,
  UserRole,
} from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import {
  ReservationDto,
  ReservationValidationDto,
  UpdateReservationDto,
} from 'src/dtos/sale/reservation.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { NotificationDto } from 'src/dtos/notification.dto';
import { Plot } from 'src/schemas/property/plot.schema';
import { House } from 'src/schemas/property/house.schema';

@Injectable()
export class ReservationService {
  cache = new NodeCache();
  masterRoles = ['ADMIN', 'SUPERADMIN', 'MANAGER', 'CUSTOMERCARE'];

  constructor(
    @InjectRepository(Reservation)
    private reservationRepo: Repository<Reservation>,
    @InjectRepository(House) private houseRepo: Repository<House>,
    @InjectRepository(Plot) private plotRepo: Repository<Plot>,
    private readonly queueProducerService: ProducerService,
  ) {}

  private async getPropertyByType(
    type: PropertyType,
    id: number,
  ): Promise<House | Plot | null> {
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

  async addReservation(
    requestDto: ReservationDto,
    authenticatedUser?: User,
  ): Promise<ApiResponse> {
    try {
      let propertyTitle = '';
      const existingReservationByClient = await this.reservationRepo.existsBy({
        propertyId: requestDto.propertyId,
        propertyType: requestDto.propertyType,
        clientId: requestDto.clientId,
      });
      if (existingReservationByClient)
        return Response.failure(Messages.PropertyAlreadyReservedByThisClient);

      const existingReservation = await this.reservationRepo.existsBy({
        propertyId: requestDto.propertyId,
        propertyType: requestDto.propertyType,
      });
      if (existingReservation)
        return Response.failure(Messages.PropertyAlreadyReserved);

      const request = {
        ...requestDto,
        status:
          authenticatedUser && this.masterRoles.includes(authenticatedUser.role)
            ? StateStatus.RESERVED
            : StateStatus.PENDING,
        code: Helpers.getCode(),
      } as unknown as Reservation;

      if (authenticatedUser) request.createdById = authenticatedUser.id;

      let propertyAvailable = false;
      if (requestDto.propertyType == PropertyType.HOUSE) {
        const property = await this.houseRepo.findOne({
          where: {
            id: requestDto.propertyId,
          },
          relations: { estate: true },
        });
        if (!property) return Response.failure(Messages.PropertyNotFound);

        if (property.status == StateStatus.AVAILABLE) {
          request.houseId = property.id;
          request.propertyLocation = property.estate
            ? property.estate.name
            : 'Standalone';
          propertyAvailable = true;
          propertyTitle = `house ${property.houseNumber} block ${property.blockNumber}`;
        } else {
          return Response.failure(Messages.PropertyNotAvailableForReservation);
        }
      }

      if (requestDto.propertyType == PropertyType.PLOT) {
        const property = await this.plotRepo.findOne({
          where: {
            id: requestDto.propertyId,
          },
          relations: { estate: true, layout: true },
        });
        if (!property) return Response.failure(Messages.PropertyNotFound);

        if (property.status == StateStatus.AVAILABLE) {
          request.plotId = property.id;
          request.propertyLocation = property.estate
            ? property.estate.name
            : property.layout
              ? property.layout.name
              : 'Standalone';
          propertyAvailable = true;
          propertyTitle = `plot ${property.plotNumber} block ${property.blockNumber}`;
        } else {
          return Response.failure(Messages.PropertyNotAvailableForReservation);
        }
      }

      if (propertyAvailable) {
        const reservation = await this.reservationRepo.save(request);

        if (requestDto.propertyType == PropertyType.PLOT) {
          const property = await this.plotRepo.findOne({
            where: {
              id: requestDto.propertyId,
            },
          });
          property.reservedById = requestDto.clientId;
          property.status = StateStatus.RESERVED;
          property.reservationId = reservation.id;
          await this.plotRepo.save(property);
        }

        if (requestDto.propertyType == PropertyType.HOUSE) {
          const property = await this.plotRepo.findOne({
            where: {
              id: requestDto.propertyId,
            },
          });
          property.reservedById = requestDto.clientId;
          property.status = StateStatus.RESERVED;
          property.reservationId = reservation.id;
          await this.houseRepo.save(property);
        }

        let subject, body;
        if (request.status == StateStatus.RESERVED) {
          subject = `Reservation Confirmed – Thank You for Choosing Us!`;
          body = `
                 Dear ${requestDto.name},

The ${requestDto.propertyType.toLowerCase()} ${propertyTitle}  with ID #${
            requestDto.propertyId
          } has been successfully reserved for you, your reservation code is #${request.code}.

Our team will reach out to you shortly to guide you through the next steps.

Thank you for choosing us!`;
        } else {
          subject = `Reservation Request Received – We're Reviewing It`;
          body = `
Dear ${requestDto.name},

We have received your reservation request for the ${requestDto.propertyType.toLowerCase()} ${propertyTitle} with ID #${
            requestDto.propertyId
          }.

Our team is currently reviewing your request and will get in touch with you shortly to confirm availability and guide you through the next steps.

Thank you for choosing us!`;
        }

        const notification = {
          from: 0,
          to: {
            name: requestDto.name,
            emailAddress: requestDto.emailAddress,
            phoneNumber: requestDto.phoneNumber,
          } as User,
          subject: subject,
          body: body,
          category: NotificationCategory.GENERAL,
          date: new Date(),
          enableEmail: true,
          enableSMS: true,
          enableInApp: false,
          priority: NotificationPriority.HIGH,
        } as unknown as NotificationDto;

        this.queueProducerService.publishNotification(notification);

        return Response.success(reservation);
      } else {
        return Response.failure(Messages.PropertyNotAvailableForReservation);
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async changeReservationStatus(
    authenticatedUser: User,
    reservationId: number,
    request: UpdateReservationDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const reservation = await this.reservationRepo.findOne({
        where: { id: reservationId },
        relations: { createdBy: true },
      });
      if (!reservation) return Response.failure(Messages.ReservationNotFound);

      if (
        request.status !== StateStatus.APPROVED &&
        request.status !== StateStatus.DECLINED
      ) {
        return Response.failure(Messages.InvalidStatus);
      }

      reservation.status = request.status;

      const updateHistory = {
        ...request,
        actionType: ActionType.UPDATE,
        actionDate: new Date(),
        actionBy: authenticatedUser.id,
        actionByUser: authenticatedUser.name,
      };

      if (reservation.updateHistory == null)
        reservation.updateHistory = [updateHistory];
      else reservation.updateHistory.push(updateHistory);

      await this.reservationRepo.save(reservation);

      let subject, body;
      let propertyTitle;

      const property = (await this.getPropertyByType(
        reservation.propertyType as PropertyType,
        reservation.propertyId,
      )) as any;

      if (property) {
        if (reservation.propertyType == PropertyType.HOUSE)
          propertyTitle = `block ${property.blockNumber}, house number ${property.houseNumber}`;
        if (reservation.propertyType == PropertyType.PLOT)
          propertyTitle = `block ${property.blockNumber}, plot number ${property.plotNumber}`;
      }

      if (request.status == StateStatus.APPROVED) {
        subject = `Reservation Confirmed – Thank You for Choosing Us!`;
        body = `
                 Dear ${reservation.name},

The ${reservation.propertyType.toLowerCase()} ${propertyTitle}  with ID #${
          reservation.propertyId
        } has been successfully reserved for you, and your reservation code is #${reservation.code}.

Our team will reach out to you shortly to guide you through the next steps.

Thank you for choosing us!`;
      }

      if (request.status == StateStatus.DECLINED) {
        subject = `Reservation Request Declined – ${propertyTitle}`;

        body = `
Dear ${reservation.name},

We regret to inform you that your reservation request for the ${reservation.propertyType.toLowerCase()} ${propertyTitle} with ID #${
          reservation.propertyId
        } has been declined.

This may be due to limited availability or other eligibility criteria.

If you have any questions or would like assistance exploring alternative options, our team is here to help.

Thank you for your interest in our properties.`;
      }

      const notification = {
        from: 0,
        to: {
          name: reservation.name,
          emailAddress: reservation.emailAddress,
          phoneNumber: reservation.phoneNumber,
        } as User,
        subject: subject,
        body: body,
        category: NotificationCategory.GENERAL,
        date: new Date(),
        enableEmail: true,
        enableSMS: true,
        enableInApp: false,
        priority: NotificationPriority.HIGH,
      } as unknown as NotificationDto;

      this.queueProducerService.publishNotification(notification);

      return Response.success(Messages.StatusChanged);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async cancelReservation(
    reservationId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      const reservation = await this.reservationRepo.findOne({
        where: {
          id: reservationId,
        },
      });
      if (!reservation) return Response.failure(Messages.ReservationNotFound);

      if (reservation.propertyType == PropertyType.HOUSE) {
        const property = await this.houseRepo.findOne({
          where: {
            id: reservation.propertyId,
          },
        });
        if (!property) return Response.failure(Messages.PropertyNotFound);

        if (property.status != StateStatus.RESERVED) {
          return Response.failure(Messages.PropertyNotInReservedState);
        }

        property.status = StateStatus.AVAILABLE;
        property.reservedById = null;

        const updateHistory = {
          status: StateStatus.AVAILABLE,
          actionType: ActionType.UPDATE,
          actionDate: new Date(),
          actionBy: authenticatedUser.id,
          actionByUser: authenticatedUser.name,
        };

        if (property.updateHistory == null)
          property.updateHistory = [updateHistory];
        else property.updateHistory.push(updateHistory);

        await this.houseRepo.save(property);
      }

      if (reservation.propertyType == PropertyType.PLOT) {
        const property = await this.plotRepo.findOne({
          where: {
            id: reservation.propertyId,
          },
        });
        if (!property) return Response.failure(Messages.PropertyNotFound);

        if (property.status != StateStatus.RESERVED) {
          return Response.failure(Messages.PropertyNotInReservedState);
        }

        property.status = StateStatus.AVAILABLE;
        const updateHistory = {
          status: StateStatus.AVAILABLE,
          actionType: ActionType.UPDATE,
          actionDate: new Date(),
          actionBy: authenticatedUser.id,
          actionByUser: authenticatedUser.name,
        };

        if (property.updateHistory == null)
          property.updateHistory = [updateHistory];
        else property.updateHistory.push(updateHistory);

        await this.houseRepo.save(property);
      }

      await this.reservationRepo.delete(reservationId);

      return Response.success(Messages.ReservationCanceledSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async validateReservation(
    authenticatedUser: User,
    propertyId: number,
    requestCode: ReservationValidationDto,
  ): Promise<ApiResponse> {
    try {
      const reservation = await this.reservationRepo.findOne({
        where: {
          code: requestCode.reservationCode,
          propertyId,
        },
      });
      if (!reservation)
        return Response.failure(Messages.InvalidReservationCode);

      return Response.success(Messages.ReservationCanceledSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllReservations(
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
      const query = {} as any;

      if (
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.MANAGER &&
        authenticatedUser.role !== UserRole.CUSTOMERCARE
      ) {
        query.clientId = authenticatedUser.id;
      }

      if (filterDto.clientId) query.clientId = filterDto.clientId;
      if (filterDto.type) query.propertyType = filterDto.type;
      if (filterDto.status) query.status = filterDto.status;

      const [result, count] = await this.reservationRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { plot: true, house: true, client: true, createdBy: true },
      });

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
      return Response.failure(Messages.NoReservationFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchReservations(
    authenticatedUser: User,
    page: number,
    limit: number,
    searchString: string,
    filterDto: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      var query = [] as any;

      if (filterDto.status) {
        query = [
          { code: Like(`%${searchString}%`), status: filterDto.status },
          { phoneNumber: Like(`%${searchString}%`), status: filterDto.status },
          { emailAddress: Like(`%${searchString}%`), status: filterDto.status },
          { name: Like(`%${searchString}%`), status: filterDto.status },
          { propertyType: Like(`%${searchString}%`), status: filterDto.status },
          { description: Like(`%${searchString}%`), status: filterDto.status },
        ];
      }

      if (filterDto.clientId) {
        query = [
          {
            propertyType: Like(`%${searchString}%`),
            clientId: filterDto.clientId,
          },
          {
            description: Like(`%${searchString}%`),
            clientId: filterDto.clientId,
          },
          { code: Like(`%${searchString}%`), clientId: filterDto.clientId },
          {
            phoneNumber: Like(`%${searchString}%`),
            clientId: filterDto.clientId,
          },
          {
            emailAddress: Like(`%${searchString}%`),
            clientId: filterDto.clientId,
          },
          { name: Like(`%${searchString}%`), clientId: filterDto.clientId },
        ];
      }

      if (
        authenticatedUser.role !== UserRole.SUPERADMIN &&
        authenticatedUser.role !== UserRole.ADMIN &&
        authenticatedUser.role !== UserRole.MANAGER &&
        authenticatedUser.role !== UserRole.CUSTOMERCARE
      ) {
        query = [
          {
            propertyType: Like(`%${searchString}%`),
            clientId: authenticatedUser.id,
          },
          {
            description: Like(`%${searchString}%`),
            clientId: authenticatedUser.id,
          },
          { code: Like(`%${searchString}%`), clientId: authenticatedUser.id },
          {
            phoneNumber: Like(`%${searchString}%`),
            clientId: authenticatedUser.id,
          },
          {
            emailAddress: Like(`%${searchString}%`),
            clientId: authenticatedUser.id,
          },
          { name: Like(`%${searchString}%`), clientId: authenticatedUser.id },
        ];
      }

      if (searchString && query.length <= 0) {
        query.push({ propertyType: Like(`%${searchString}%`) });
        query.push({ description: Like(`%${searchString}%`) });
        query.push({ status: Like(`%${searchString}%`) });
        query.push({ name: Like(`%${searchString}%`) });
        query.push({ emailAddress: Like(`%${searchString}%`) });
        query.push({ phoneNumber: Like(`%${searchString}%`) });
        query.push({ code: Like(`%${searchString}%`) });
      }

      const [result, count] = await this.reservationRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: {
          plot: true,
          house: true,
          client: true,
          createdBy: true,
        },
      });

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
      return Response.failure(Messages.NoReservationFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
