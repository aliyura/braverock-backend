import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Helpers, Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import { Broadcast } from 'src/schemas/broadcast/broadcast.schema';
import {
  NewBroadcastDto,
  UpdateBroadcastDto,
} from 'src/dtos/broadcast/broadcast.dto';
import { Contact } from 'src/schemas/broadcast/contact.schema';
import { BroadcastLog } from 'src/schemas/broadcast/broadcast-log.schema';
import { UserRole, StateStatus } from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import {
  BroadcastDistributionDto,
  BroadcastDto,
} from 'src/dtos/notification.dto';
import { FilterDto } from 'src/dtos/filter.dto';

@Injectable()
export class BroadcastService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(Broadcast) private broadcastRepo: Repository<Broadcast>,
    @InjectRepository(Contact) private contactRepo: Repository<Contact>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(BroadcastLog)
    private broadcastLogRepo: Repository<BroadcastLog>,
    private readonly queueProducerService: ProducerService,
  ) {}

  async createBroadcast(
    authenticatedUser: User,
    requestDto: NewBroadcastDto,
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

      const broadcast: Broadcast = {
        ...requestDto,
        createdById: authenticatedUser.id,
      } as unknown as Broadcast;

      const created = await this.broadcastRepo.save(broadcast);

      const distribution = {
        broadcastId: created.id,
        roles: requestDto.roles ?? [],
        contactIds: requestDto.contactIds ?? [],
        groupIds: requestDto.groupIds ?? [],
        createdById: authenticatedUser.id,
      } as BroadcastDistributionDto;

      await this.queueProducerService.publishBroadcastDistribution(
        distribution,
      );
      return Response.success(created);
    } catch (ex) {
      console.error(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateBroadcast(
    broadcastId: number,
    authenticatedUser: User,
    requestDto: UpdateBroadcastDto,
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

      const existing = await this.broadcastRepo.findOne({
        where: { id: broadcastId },
      });
      if (!existing) return Response.failure(Messages.NotFound);

      const updateRequest = { ...existing, ...requestDto } as Broadcast;

      await this.broadcastRepo.update({ id: broadcastId }, updateRequest);
      const updated = await this.broadcastRepo.findOne({
        where: { id: broadcastId },
      });

      return Response.success(updated);
    } catch (ex) {
      console.error(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async releaseBroadcast(
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

      const broadcast = await this.broadcastRepo.findOne({
        where: { id: broadcastId },
      });
      if (!broadcast) return Response.failure(Messages.NotFound);

      await this.queueProducerService.publishBroadcastRelease({
        id: broadcastId,
      });
      return Response.success(Messages.BroadcastPublished);
    } catch (ex) {
      console.error(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteBroadcast(
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

      await this.broadcastRepo.delete(broadcastId);
      await this.broadcastLogRepo.delete({ broadcastId: broadcastId });

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.error(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getBroadcastById(broadcastId: number): Promise<ApiResponse> {
    try {
      const broadcast = await this.broadcastRepo.findOne({
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

  async getBroadcasts(
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
      const query = { createdAt: 'DESC' } as any;

      if (filter.channel) query.channel = filter.channel;
      const [result, count] = await this.broadcastRepo.findAndCount({
        order: query,
        take: size,
        skip: skip * size,
        relations: { createdBy: true },
      });

      if (result.length) {
        const totalPages = Math.ceil(count / size);
        const analytic = {
          totalBroadcasts: await this.broadcastRepo.count(),
          pending: this.broadcastLogRepo.count({
            where: { status: StateStatus.PENDING },
          }),
          queued: this.broadcastLogRepo.count({
            where: { status: StateStatus.QUEUED },
          }),
          delivered: this.broadcastLogRepo.count({
            where: { status: StateStatus.DELIVERED },
          }),
          failed: this.broadcastLogRepo.count({
            where: { status: StateStatus.FAILED },
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
      return Response.failure(Messages.NotFound);
    } catch (ex) {
      console.error(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchBroadcast(
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

      const targetFields = ['channel', 'subject', 'message'];
      const query = Helpers.buildSearchQuery(
        searchString,
        targetFields,
        filter,
      );

      const [result, count] = await this.broadcastRepo.findAndCount({
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
      return Response.failure(
        Messages.NoBroadcastFound || 'No broadcast found',
      );
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
