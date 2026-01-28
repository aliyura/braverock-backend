import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Between, In, Like, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Helpers, Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import { ActionType, StateStatus, UserRole } from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import { ScheduleDto, UpdateScheduleDto } from 'src/dtos/schedule.dto';
import { Schedule } from 'src/schemas/schedule.schema';
import { FilterDto } from 'src/dtos/filter.dto';
import { Estate } from 'src/schemas/property/estate.schema';

@Injectable()
export class ScheduleService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Schedule) private scheduleRepo: Repository<Schedule>,
    @InjectRepository(Estate) private estateRepo: Repository<Estate>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly queueProducerService: ProducerService,
  ) {}

  async addSchedule(
    authenticatedUser: User,
    requestDto: ScheduleDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.SITEENGINEER &&
        authenticatedUser.role != UserRole.LEADENGINEER
      )
        return Response.failure(Messages.NoPermission);

      const estate = await this.estateRepo.findOne({
        where: { id: requestDto.estateId },
      });
      if (!estate) return Response.failure(Messages.EstateNotFound);

      const request = {
        ...requestDto,
        title: `Daily Schedule for ${estate.name} on ${Helpers.getDate()}`,
        status: StateStatus.ACTIVE,
        createdById: authenticatedUser.id,
      } as unknown as Schedule;

      this.scheduleRepo.update(
        { status: StateStatus.INACTIVE },
        { createdById: authenticatedUser.id, estateId: requestDto.estateId },
      );

      const savedSchedule = await this.scheduleRepo.save(request);
      if (savedSchedule) {
        return Response.success(savedSchedule);
      } else {
        return Response.failure('Unable to add schedule');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateSchedule(
    scheduleId: number,
    authenticatedUser: User,
    requestDto: UpdateScheduleDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.SITEENGINEER &&
        authenticatedUser.role != UserRole.LEADENGINEER
      )
        return Response.failure(Messages.NoPermission);

      const schedule = await this.scheduleRepo.findOne({
        where: { id: scheduleId },
      });
      if (!schedule) return Response.failure(Messages.ScheduleNotAvailable);

      const updateRequest = {
        ...schedule,
        ...requestDto,
      } as Schedule;

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

      await this.scheduleRepo.update({ id: scheduleId }, updateRequest);
      const updatedUser = await this.scheduleRepo.findOne({
        where: { id: scheduleId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getScheduleById(
    authenticatedUser: User,
    scheduleId: number,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.SITEENGINEER &&
        authenticatedUser.role != UserRole.LEADENGINEER
      )
        return Response.failure(Messages.NoPermission);

      const schedule = await this.scheduleRepo.findOne({
        where: { id: scheduleId },
        relations: { createdBy: true, estate: true },
      });
      if (schedule) return Response.success(schedule);
      return Response.failure(Messages.ScheduleNotAvailable);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getLastSchedule(authenticatedUser: User): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.SITEENGINEER &&
        authenticatedUser.role != UserRole.LEADENGINEER
      )
        return Response.failure(Messages.NoPermission);

      const schedule = await this.scheduleRepo.findOne({
        where: { createdById: authenticatedUser.id },
        relations: { createdBy: true, estate: true },
        order: { id: 'DESC' },
      });
      if (schedule) return Response.success(schedule);
      return Response.failure(Messages.ScheduleNotAvailable);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteSchedule(
    authenticatedUser: User,
    scheduleId: number,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.SITEENGINEER &&
        authenticatedUser.role != UserRole.LEADENGINEER
      )
        return Response.failure(Messages.NoPermission);

      await this.scheduleRepo.delete(scheduleId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllSchedules(
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
      if (filter.userId) query.createdById = filter.userId;

      if (authenticatedUser.role == UserRole.SITEENGINEER) {
        query.createdById = authenticatedUser.id;
      }

      if (filter.from || filter.to) {
        query.createdAt = Between(
          Helpers.formatDate(
            new Date(filter.from ?? Helpers.formatDate(new Date())),
          ),
          Helpers.formatToNextDay(
            new Date(filter.to ?? Helpers.formatDate(new Date())),
          ),
        );
      }
      const [result, count] = await this.scheduleRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        relations: { createdBy: true, estate: true },
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
      return Response.failure(Messages.NoScheduleFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchSchedules(
    authenticatedUser: User,
    page: number,
    limit: number,
    searchString: string,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const query = [] as any;

      if (authenticatedUser.role == UserRole.SITEENGINEER) {
        if (searchString) {
          query.push({
            title: Like(`%${searchString}%`),
            activities: Like(`%${searchString}%`),
            createdById: authenticatedUser.id,
          });
        }
      } else {
        if (searchString) {
          query.push({
            title: Like(`%${searchString}%`),
            activities: Like(`%${searchString}%`),
          });
        }
      }

      const [result, count] = await this.scheduleRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        relations: { createdBy: true, estate: true },
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
      return Response.failure(Messages.NoScheduleFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
