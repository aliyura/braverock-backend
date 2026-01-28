import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Like, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Helpers, Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import {
  ActionType,
  PropertyType,
  PropertyVisibility,
  StateStatus,
  UserRole,
} from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import { UpdateStatusDto } from 'src/dtos/master';
import { FilterDto } from 'src/dtos/filter.dto';
import { DiscountOffer } from 'src/schemas/property/discount-offer.schema';
import { House } from 'src/schemas/property/house.schema';
import { Plot } from 'src/schemas/property/plot.schema';
import { Layout } from 'src/schemas/property/layout.schema';
import {
  DiscountOfferDto,
  UpdateDiscountOfferDto,
} from 'src/dtos/property/discount-offer.dto';

@Injectable()
export class DiscountOfferService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(DiscountOffer)
    private discountOfferRepo: Repository<DiscountOffer>,
    @InjectRepository(User) private userRepo: Repository<User>,
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

  async addDiscountOffer(
    authenticatedUser: User,
    requestDto: DiscountOfferDto,
  ): Promise<ApiResponse> {
    try {
      if (!Helpers.getManagementRoles().includes(authenticatedUser.role))
        return Response.failure(Messages.NoPermission);

      const property = (await this.getPropertyByType(
        requestDto.propertyType,
        requestDto.propertyId,
      )) as House | Layout | any;

      if (!property) return Response.failure(Messages.PropertyNotFound);

      const discountOfferExist = await this.discountOfferRepo.existsBy({
        propertyId: requestDto.propertyId,
        propertyType: requestDto.propertyType,
      });

      if (discountOfferExist)
        return Response.failure(
          Messages.DiscountOfferAlreadyExistOnThisProperty,
        );

      const request = {
        ...requestDto,
        status: StateStatus.ACTIVE,
        houseId:
          property && requestDto.propertyType == PropertyType.HOUSE
            ? property.id
            : null,
        plotId:
          property && requestDto.propertyType == PropertyType.PLOT
            ? property.id
            : null,
        propertyLocation: property.estate
          ? property.estate.name
          : property.layout
            ? property.layout.name
            : 'Standalone',
        code: Helpers.getCode(),
        createdById: authenticatedUser.id,
      } as unknown as DiscountOffer;

      const created = await this.discountOfferRepo.save(request);
      if (created) {
        return Response.success(created);
      } else {
        return Response.failure('Unable to add discountOffer');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateDiscountOffer(
    discountOfferId: number,
    authenticatedUser: User,
    requestDto: UpdateDiscountOfferDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.CUSTOMERCARE
      )
        return Response.failure(Messages.NoPermission);

      const discountOffer = await this.discountOfferRepo.findOne({
        where: { id: discountOfferId },
      });
      if (!discountOffer)
        return Response.failure(Messages.DiscountOfferNotAvailable);

      const updateRequest = {
        ...discountOffer,
        ...requestDto,
      } as unknown as DiscountOffer;

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

      await this.discountOfferRepo.update(
        { id: discountOfferId },
        updateRequest,
      );
      const updatedUser = await this.discountOfferRepo.findOne({
        where: { id: discountOfferId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteDiscountOffer(
    discountOfferId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.CUSTOMERCARE
      )
        return Response.failure(Messages.NoPermission);

      await this.discountOfferRepo.delete(discountOfferId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async changeDiscountOfferStatus(
    authenticatedUser: User,
    discountOfferId: number,
    request: UpdateStatusDto,
  ): Promise<ApiResponse> {
    try {
      const discountOffer = await this.discountOfferRepo.findOne({
        where: { id: discountOfferId },
        relations: { createdBy: true },
      });
      if (!discountOffer)
        return Response.failure(Messages.DiscountOfferNotFound);

      await this.discountOfferRepo.save(discountOffer);

      return Response.success('DiscountOffer status updated successfully');
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getDiscountOfferById(discountOfferId: number): Promise<ApiResponse> {
    try {
      const discountOffer = await this.discountOfferRepo.findOne({
        where: { id: discountOfferId },
        relations: { house: true, plot: true, createdBy: true },
      });
      if (discountOffer) return Response.success(discountOffer);

      return Response.failure(Messages.DiscountOfferNotAvailable);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllDiscountOffers(
    authenticatedUser: User,
    page: number,
    limit: number,
    filterDto: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const dimension =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_dimension) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const requiredFilter = {} as any;
      if (!Helpers.getManagementRoles().includes(authenticatedUser.role))
        requiredFilter.status = StateStatus.ACTIVE;

      const query = Helpers.buildFilteredQuery(filterDto, requiredFilter);

      const [result, count] = await this.discountOfferRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: dimension,
        skip: skip * dimension,
        relations: { house: true, plot: true, createdBy: true },
      });

      if (result.length) {
        const analytic = {
          discountOffers: await this.discountOfferRepo.count(),
          active: await this.discountOfferRepo.count({
            where: { status: StateStatus.ACTIVE },
          }),
          closed: await this.discountOfferRepo.count({
            where: { status: StateStatus.CLOSED },
          }),
          endingSoon: await this.discountOfferRepo.count({
            where: { endDate: MoreThan(new Date(Helpers.lastWeekDate())) },
          }),
        };
        const totalPages = Math.round(count / dimension);
        return Response.success({
          analytic,
          page: result,
          dimension: dimension,
          currentPage: Number(skip),
          totalPages:
            totalPages > 0
              ? totalPages
              : count > 0 && result.length > 0
                ? 1
                : 0,
        });
      }
      return Response.failure(Messages.NoDiscountOffersFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
  async searchDiscountOffers(
    authenticatedUser: User,
    page: number,
    limit: number,
    searchString: string,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const dimension =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_dimension) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const targetFields = [
        'title',
        'discountOfferType',
        'bonusDescription',
        'visibility',
        'description',
        'discountType',
        'audiance',
      ];
      const requiredFilter = {
        status: StateStatus.ACTIVE,
        visibility: PropertyVisibility.PUBLIC,
      };
      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
        requiredFilter,
      );

      const [result, count] = await this.discountOfferRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: dimension,
        skip: skip * dimension,
        relations: { house: true, plot: true, createdBy: true },
      });

      if (result.length) {
        const totalPages = Math.round(count / dimension);
        return Response.success({
          page: result,
          dimension: dimension,
          currentPage: Number(skip),
          totalPages:
            totalPages > 0
              ? totalPages
              : count > 0 && result.length > 0
                ? 1
                : 0,
        });
      }
      return Response.failure(Messages.NoDiscountOffersFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllPublicDiscountOffers(
    page: number,
    limit: number,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const dimension =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_dimension) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const query = {
        status: StateStatus.ACTIVE,
        visibility: PropertyVisibility.PUBLIC,
      } as any;

      const [result, count] = await this.discountOfferRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: dimension,
        skip: skip * dimension,
        relations: { house: true, plot: true, createdBy: true },
      });

      if (result.length) {
        const totalPages = Math.round(count / dimension);
        return Response.success({
          page: result,
          dimension: dimension,
          currentPage: Number(skip),
          totalPages:
            totalPages > 0
              ? totalPages
              : count > 0 && result.length > 0
                ? 1
                : 0,
        });
      }
      return Response.failure(Messages.NoDiscountOffersFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchPublicDiscountOffers(
    page: number,
    limit: number,
    searchString: string,
    filter: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const dimension =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_dimension) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const targetFields = [
        'title',
        'discountOfferType',
        'bonusDescription',
        'visibility',
        'description',
        'discountType',
        'audiance',
      ];
      const requiredFilter = {
        visibility: PropertyVisibility.PUBLIC,
        status: StateStatus.ACTIVE,
      };
      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
        requiredFilter,
      );

      const [result, count] = await this.discountOfferRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: dimension,
        skip: skip * dimension,
        relations: { house: true, plot: true, createdBy: true },
      });

      if (result.length) {
        const total = (await this.discountOfferRepo.count()) ?? 0;
        const totalActive =
          (await this.discountOfferRepo.count({
            where: { status: StateStatus.ACTIVE },
          })) ?? 0;
        const totalEndingSoon =
          (await this.discountOfferRepo.find({
            where: { endDate: MoreThan(new Date(Helpers.lastWeekDate())) },
          })) ?? 0;

        const totalPages = Math.round(count / dimension);
        return Response.success({
          total,
          totalActive,
          totalEndingSoon,
          page: result,
          dimension: dimension,
          currentPage: Number(skip),
          totalPages:
            totalPages > 0
              ? totalPages
              : count > 0 && result.length > 0
                ? 1
                : 0,
        });
      }
      return Response.failure(Messages.NoDiscountOffersFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
