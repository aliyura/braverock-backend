import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Helpers, Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import { BroadcastLog } from 'src/schemas/broadcast/broadcast-log.schema';
import { StateStatus, UserRole } from 'src/enums';
import { FilterDto } from 'src/dtos/filter.dto';

@Injectable()
export class BroadcastLogService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(BroadcastLog)
    private broadcastLogRepo: Repository<BroadcastLog>,
  ) {}

  async deleteBroadcastLog(
    broadcastId: number,
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

      await this.broadcastLogRepo.delete(broadcastId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.error(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getBroadcastLogById(broadcastId: number): Promise<ApiResponse> {
    try {
      const broadcast = await this.broadcastLogRepo.findOne({
        where: { id: broadcastId },
        relations: { createdBy: true },
      });

      if (broadcast) return Response.success(broadcast);

      return Response.failure(Messages.NotFound);
    } catch (ex) {
      console.error(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getBroadcastLogs(
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

      const query = Helpers.buildFilteredQuery(filter);
      console.log('query:', query);

      const [result, count] = await this.broadcastLogRepo.findAndCount({
        order: query,
        take: size,
        skip: skip * size,
        relations: {
          createdBy: true,
          group: true,
          contact: true,
          broadcast: true,
        },
      });

      if (result.length) {
        const totalPages = Math.ceil(count / size);

        const analytic = {
          pending: this.broadcastLogRepo.count({
            where: { status: StateStatus.PENDING, ...query },
          }),
          queued: this.broadcastLogRepo.count({
            where: { status: StateStatus.QUEUED, ...query },
          }),
          delivered: this.broadcastLogRepo.count({
            where: { status: StateStatus.DELIVERED, ...query },
          }),
          failed: this.broadcastLogRepo.count({
            where: { status: StateStatus.FAILED, ...query },
          }),
        };

        return Response.success({
          analytic,
          page: result,
          size,
          currentPage: skip,
          totalPages,
        });
      }
      return Response.failure(Messages.NoBroadcastFound);
    } catch (ex) {
      console.error(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchBroadcastLogs(
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

      const targetFields = ['channel', 'group', 'contact'];
      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
      );

      const [result, count] = await this.broadcastLogRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: {
          createdBy: true,
          group: true,
          contact: true,
          broadcast: true,
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
      return Response.failure(
        Messages.NoBroadcastFound || 'No broadcast history found',
      );
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
