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
import { LayoutDto, UpdateLayoutDto } from 'src/dtos/property/layout.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { UpdateStatusDto } from 'src/dtos/master';
import { Layout } from 'src/schemas/property/layout.schema';
@Injectable()
export class LayoutService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Layout) private layoutRepo: Repository<Layout>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly queueProducerService: ProducerService,
  ) {}

  async addLayout(
    authenticatedUser: User,
    requestDto: LayoutDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER &&
        authenticatedUser.role != UserRole.CUSTOMERCARE
      )
        return Response.failure(Messages.NoPermission);

      const request = {
        ...requestDto,
        createdById: authenticatedUser.id,
      } as unknown as Layout;

      const created = await this.layoutRepo.save(request);
      if (created) {
        return Response.success(created);
      } else {
        return Response.failure('Unable to add layout');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateLayout(
    layoutId: number,
    authenticatedUser: User,
    requestDto: UpdateLayoutDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const layout = await this.layoutRepo.findOne({
        where: { id: layoutId },
      });
      if (!layout) return Response.failure(Messages.LayoutNotAvailable);

      const updateRequest = {
        ...layout,
        ...requestDto,
      } as Layout;

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

      await this.layoutRepo.update({ id: layoutId }, updateRequest);
      const updatedUser = await this.layoutRepo.findOne({
        where: { id: layoutId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async changeLayoutStatus(
    authenticatedUser: User,
    layoutId: number,
    request: UpdateStatusDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const layout = await this.layoutRepo.findOne({
        where: { id: layoutId },
        relations: { createdBy: true },
      });

      layout.status = request.status;

      const updateHistory = {
        ...request,
        actionType: ActionType.UPDATE,
        actionDate: new Date(),
        actionBy: authenticatedUser.id,
        actionByUser: authenticatedUser.name,
      };

      if (layout.updateHistory == null) layout.updateHistory = [updateHistory];
      else layout.updateHistory.push(updateHistory);

      await this.layoutRepo.save(layout);

      return Response.success(Messages.StatusChanged);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteLayout(
    layoutId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      await this.layoutRepo.delete(layoutId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getLayoutById(
    authenticatedUser: User,
    layoutId: number,
  ): Promise<ApiResponse> {
    try {
      const layout = await this.layoutRepo.findOne({
        where: { id: layoutId },
        relations: { createdBy: true },
      });
      if (layout) return Response.success(layout);
      return Response.failure(Messages.LayoutNotAvailable);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllLayouts(
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

      const [result, count] = await this.layoutRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true },
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
      return Response.failure(Messages.NoLayoutFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchLayouts(
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
        'acquisitionType',
        'type',
        'lga',
        'district',
        'state',
        'features',
        'description',
        'address',
        'city',
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

      const [result, count] = await this.layoutRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true },
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
      return Response.failure(Messages.NoLayoutFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllPublicLayouts(
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

      const [result, count] = await this.layoutRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true },
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
      return Response.failure(Messages.NoLayoutFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchPublicLayouts(
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
        'acquisitionType',
        'type',
        'lga',
        'district',
        'state',
        'features',
        'description',
        'address',
        'city',
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

      const [result, count] = await this.layoutRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { createdBy: true },
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
      return Response.failure(Messages.NoLayoutFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
