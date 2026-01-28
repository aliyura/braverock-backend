import { Offer } from '../../schemas/sale/offer.schema';
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
  StateStatus,
  UserRole,
} from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import { OfferDto, UpdateOfferDto } from 'src/dtos/sale/offer.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { NotificationDto } from 'src/dtos/notification.dto';
import { Sale } from 'src/schemas/sale/sale.schema';
import { UpdateStatusDto } from 'src/dtos/master';

@Injectable()
export class OfferService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Offer)
    private offerRepo: Repository<Offer>,
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    private readonly queueProducerService: ProducerService,
  ) {}

  async addOffer(
    authenticatedUser: User,
    requestDto: OfferDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const sale = await this.saleRepo.findOne({
        where: { id: requestDto.saleId },
      });
      if (!sale) return Response.failure(Messages.SaleNotAvailable);

      if (sale.status == StateStatus.PENDING)
        return Response.failure(Messages.UnableToOfferPendingSale);

      const existingOffer = await this.offerRepo.findOne({
        where: { saleId: sale.id },
      });
      if (existingOffer) {
        existingOffer.offerLetter = requestDto.offerLetter;
        existingOffer.updatedAt = new Date();

        const updateHistory = {
          ...requestDto,
          actionType: ActionType.UPDATE,
          actionDate: new Date(),
          actionBy: authenticatedUser.id,
          actionByUser: authenticatedUser.name,
        };

        if (existingOffer.updateHistory == null)
          existingOffer.updateHistory = [updateHistory];
        else existingOffer.updateHistory.push(updateHistory);

        const savedOffer = await this.offerRepo.save(existingOffer);
        return Response.success(savedOffer);
      } else {
        const request = {
          ...requestDto,
          status: StateStatus.ALLOCATED,
          createdById: authenticatedUser.id,
          saleId: sale.id,
          plotId: sale.plotId || null,
          houseId: sale.houseId || null,
          offerNumber: Helpers.generateNumber('OF'),
        } as Offer;

        const createdOffer = await this.offerRepo.save(request);
        if (createdOffer) {
          sale.offerStatus = StateStatus.OFFERED;
          sale.offerId = createdOffer.id;
          await this.saleRepo.save(sale);

          const notification = {
            from: 0,
            to: {
              name: sale.name,
              emailAddress: sale.emailAddress,
              phoneNumber: sale.phoneNumber,
            },
            context: createdOffer,
            subject: 'Offer of House',
            category: NotificationCategory.ALLOCATION,
            enableEmail: true,
            enableSMS: true,
            enableInApp: false,
            priority: NotificationPriority.HIGH,
          } as NotificationDto;

          this.queueProducerService.publishNotification(notification);

          return Response.success(createdOffer);
        } else {
          return Response.failure('Unable to add offer');
        }
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateOffer(
    authenticatedUser: User,
    offerId: number,
    requestDto: UpdateOfferDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const offer = await this.offerRepo.findOne({
        where: { id: offerId },
      });
      if (!offer) return Response.failure(Messages.OfferNotAvailable);

      const updateRequest = {
        ...offer,
        ...requestDto,
      } as unknown as Offer;

      const updateHistory = {
        ...requestDto,
        actionType: ActionType.UPDATE,
        actionDate: new Date(),
        actionBy: authenticatedUser.id,
        actionByUser: authenticatedUser.name,
      };

      if (updateRequest.updateHistory == null)
        updateRequest.updateHistory = [updateHistory];
      else updateRequest.updateHistory.push(updateHistory);

      await this.offerRepo.update({ id: offerId }, updateRequest);
      const updatedUser = await this.offerRepo.findOne({
        where: { id: offerId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateOfferStatus(
    offerId: number,
    authenticatedUser: User,
    requestDto: UpdateStatusDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const offer = await this.offerRepo.findOne({
        where: { id: offerId },
      });
      if (!offer) return Response.failure(Messages.OfferNotAvailable);

      const sale = await this.saleRepo.findOne({
        where: { id: offer.saleId },
      });
      if (!sale) return Response.failure(Messages.SaleNotAvailable);

      if (requestDto.status == StateStatus.APPROVED) {
        offer.status = StateStatus.ALLOCATED;
        sale.offerStatus = StateStatus.ALLOCATED;
      } else if (requestDto.status == StateStatus.CANCELED) {
        offer.status = StateStatus.CANCELED;
        sale.offerStatus = StateStatus.CANCELED;
      } else {
        return Response.failure(Messages.InvalidStatus);
      }

      await this.saleRepo.save(sale);
      const savedOffer = await this.offerRepo.save(offer);
      //send offer change notification
      return Response.success(savedOffer);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteOffer(
    offerId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      await this.offerRepo.delete(offerId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getOfferById(
    offerId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      const offer = await this.offerRepo.findOne({
        where: { id: offerId },
        relations: { sale: true },
      });
      if (offer) return Response.success(offer);

      return Response.failure(Messages.OfferNotAvailable);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllOffers(
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

      const query = {} as any;

      if (filter.status) query.status = filter.status;

      const [result, count] = await this.offerRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        relations: { sale: true, house: true, plot: true },
        take: size,
        skip: skip * size,
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
      return Response.failure(Messages.NoOfferFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchOffers(
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

      var query = [] as any;

      query = [
        { offerNumber: Like(`%${searchString}%`) },
        { status: Like(`%${searchString}%`) },
      ];

      if (filter.status) {
        query = [
          {
            offerNumber: Like(`%${searchString}%`),
            status: filter.status,
          },
        ];
      }

      const [result, count] = await this.offerRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        relations: { sale: true, house: true, plot: true },
        take: size,
        skip: skip * size,
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
      return Response.failure(Messages.NoOfferFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
