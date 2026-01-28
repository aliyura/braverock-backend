import { Estate } from '../../schemas/property/estate.schema';
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
  PropertyVisibility,
  StateStatus,
  UserRole,
} from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import {
  EstateDto,
  EstateEngineerDto,
  UpdateEstateDto,
} from 'src/dtos/property/estate.dto';
import { FilterDto } from 'src/dtos/filter.dto';
@Injectable()
export class EstateService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Estate) private estateRepo: Repository<Estate>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly queueProducerService: ProducerService,
  ) {}

  async addEstate(
    authenticatedUser: User,
    requestDto: EstateDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.CUSTOMERCARE
      )
        return Response.failure(Messages.NoPermission);

      if (requestDto.engineerId == 0) delete requestDto.engineerId;

      const estateExist = await this.estateRepo.existsBy({
        name: requestDto.name,
      });
      if (estateExist) return Response.failure(Messages.EstateAlreadyExist);

      const request = {
        ...requestDto,
        createdById: authenticatedUser.id,
      } as unknown as Estate;

      const created = await this.estateRepo.save(request);
      if (created) {
        return Response.success(created);
      } else {
        return Response.failure('Unable to add estate');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async addEngineer(
    authenticatedUser: User,
    requestDto: EstateEngineerDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const siteEngineer = await this.userRepo.findOne({
        where: { id: requestDto.siteEngineerId },
      });
      if (!siteEngineer) return Response.failure(Messages.SiteEngineerNotFound);

      const estate = await this.estateRepo.findOne({
        where: { id: requestDto.estateId },
      });
      if (!estate) return Response.failure(Messages.EstateNotAvailable);

      estate.engineerId = siteEngineer.id;
      await this.estateRepo.save(estate);

      if (siteEngineer.estates == null) siteEngineer.estates = [estate];
      else siteEngineer.estates.push(estate);

      await this.userRepo.save(siteEngineer);

      return Response.success(estate);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async removeEngineer(
    authenticatedUser: User,
    requestDto: EstateEngineerDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const siteEngineer = await this.userRepo.findOne({
        where: { id: requestDto.siteEngineerId },
      });
      if (!siteEngineer) return Response.failure(Messages.SiteEngineerNotFound);

      const estate = await this.estateRepo.findOne({
        where: { id: requestDto.estateId },
      });
      if (!estate) return Response.failure(Messages.EstateNotAvailable);

      estate.engineerId = null;
      await this.estateRepo.save(estate);

      if (siteEngineer.estates != null) {
        const newEstates = siteEngineer.estates.filter(
          (estate) => estate.id != requestDto.estateId,
        );
        if (newEstates.length > 0) siteEngineer.estates = newEstates;
        else siteEngineer.estates = null;
      }
      await this.userRepo.save(siteEngineer);

      return Response.success(estate);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateEstate(
    estateId: number,
    authenticatedUser: User,
    requestDto: UpdateEstateDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const estate = await this.estateRepo.findOne({
        where: { id: estateId },
      });
      if (!estate) return Response.failure(Messages.EstateNotAvailable);

      const updateRequest = {
        ...estate,
        ...requestDto,
      } as Estate;

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

      await this.estateRepo.update({ id: estateId }, updateRequest);
      const updatedUser = await this.estateRepo.findOne({
        where: { id: estateId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteEstate(
    estateId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      await this.estateRepo.delete(estateId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getEstateById(
    estateId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      const estate = await this.estateRepo.findOne({ where: { id: estateId } });
      if (estate) return Response.success(estate);
      return Response.failure(Messages.EstateNotFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllEstates(
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

      const query = Helpers.buildFilteredQuery(filterDto);

      if (authenticatedUser.role == UserRole.SITEENGINEER)
        query.engineerId = authenticatedUser.id;

      const [result, count] = await this.estateRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { engineer: true },
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
      return Response.failure(Messages.NoEstateFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchEstates(
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

      const targetFields = [
        'name',
        'type',
        'lga',
        'district',
        'state',
        'features',
        'description',
        'visibility',
      ];
      const requiredFilter = {} as any;

      if (authenticatedUser.role == UserRole.SITEENGINEER)
        requiredFilter.engineerId = authenticatedUser.id;

      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filterDto,
        requiredFilter,
      );
      const [result, count] = await this.estateRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { engineer: true },
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
      return Response.failure(Messages.NoEstateFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllPublicEstates(
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

      const requiredFilter = { visibility: PropertyVisibility.PUBLIC } as any;
      const query = Helpers.buildFilteredQuery(filterDto, requiredFilter);

      const [result, count] = await this.estateRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { engineer: true },
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
      return Response.failure(Messages.NoEstateFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchPublicEstates(
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

      const targetFields = [
        'name',
        'type',
        'lga',
        'district',
        'state',
        'features',
        'description',
        'visibility',
      ];

      const requiredFilter = {
        visibility: PropertyVisibility.PUBLIC,
      };
      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filterDto,
        requiredFilter,
      );

      const [result, count] = await this.estateRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { engineer: true },
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
      return Response.failure(Messages.NoEstateFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
