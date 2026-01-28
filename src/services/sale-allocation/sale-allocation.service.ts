import { Allocation } from '../../schemas/sale/allocation.schema';
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
import {
  AllocationDto,
  UpdateAllocationDto,
} from 'src/dtos/sale/allocation.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { NotificationDto } from 'src/dtos/notification.dto';
import { Sale } from 'src/schemas/sale/sale.schema';
import { UpdateStatusDto } from 'src/dtos/master';

@Injectable()
export class AllocationService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Allocation)
    private allocationRepo: Repository<Allocation>,
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    private readonly queueProducerService: ProducerService,
  ) {}

  async addAllocation(
    authenticatedUser: User,
    requestDto: AllocationDto,
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
        return Response.failure(Messages.UnableToAllocatePendingSale);

      const existingAllocation = await this.allocationRepo.findOne({
        where: { saleId: sale.id },
      });
      if (existingAllocation) {
        existingAllocation.allocationLetter = requestDto.allocationLetter;
        existingAllocation.updatedAt = new Date();

        const updateHistory = {
          ...requestDto,
          actionType: ActionType.UPDATE,
          actionDate: new Date(),
          actionBy: authenticatedUser.id,
          actionByUser: authenticatedUser.name,
        };

        if (existingAllocation.updateHistory == null)
          existingAllocation.updateHistory = [updateHistory];
        else existingAllocation.updateHistory.push(updateHistory);

        const savedAllocation =
          await this.allocationRepo.save(existingAllocation);
        return Response.success(savedAllocation);
      } else {
        const request = {
          ...requestDto,
          status: StateStatus.ALLOCATED,
          createdById: authenticatedUser.id,
          saleId: sale.id,
          plotId: sale.plotId || null,
          houseId: sale.houseId || null,
          allocationNumber: Helpers.generateNumber('AL'),
        } as Allocation;

        const createdAllocation = await this.allocationRepo.save(request);
        if (createdAllocation) {
          sale.allocationStatus = StateStatus.ALLOCATED;
          sale.allocationId = createdAllocation.id;
          await this.saleRepo.save(sale);

          const notification = {
            from: 0,
            to: {
              name: sale.name,
              emailAddress: sale.emailAddress,
              phoneNumber: sale.phoneNumber,
            },
            context: createdAllocation,
            subject: 'Allocation of House',
            category: NotificationCategory.ALLOCATION,
            enableEmail: true,
            enableSMS: true,
            enableInApp: false,
            priority: NotificationPriority.HIGH,
          } as NotificationDto;

          this.queueProducerService.publishNotification(notification);

          return Response.success(createdAllocation);
        } else {
          return Response.failure('Unable to add allocation');
        }
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateAllocation(
    authenticatedUser: User,
    allocationId: number,
    requestDto: UpdateAllocationDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const allocation = await this.allocationRepo.findOne({
        where: { id: allocationId },
      });
      if (!allocation) return Response.failure(Messages.AllocationNotAvailable);

      const updateRequest = {
        ...allocation,
        ...requestDto,
      } as unknown as Allocation;

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

      await this.allocationRepo.update({ id: allocationId }, updateRequest);
      const updatedUser = await this.allocationRepo.findOne({
        where: { id: allocationId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateAllocationStatus(
    allocationId: number,
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

      const allocation = await this.allocationRepo.findOne({
        where: { id: allocationId },
      });
      if (!allocation) return Response.failure(Messages.AllocationNotAvailable);

      const sale = await this.saleRepo.findOne({
        where: { id: allocation.saleId },
      });
      if (!sale) return Response.failure(Messages.SaleNotAvailable);

      if (requestDto.status == StateStatus.APPROVED) {
        allocation.status = StateStatus.ALLOCATED;
        sale.allocationStatus = StateStatus.ALLOCATED;
      } else if (requestDto.status == StateStatus.CANCELED) {
        allocation.status = StateStatus.CANCELED;
        sale.allocationStatus = StateStatus.CANCELED;
      } else {
        return Response.failure(Messages.InvalidStatus);
      }

      await this.saleRepo.save(sale);
      const savedAllocation = await this.allocationRepo.save(allocation);
      //send allocation change notification
      return Response.success(savedAllocation);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteAllocation(
    allocationId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      await this.allocationRepo.delete(allocationId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getAllocationById(
    allocationId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      const allocation = await this.allocationRepo.findOne({
        where: { id: allocationId },
        relations: { sale: true },
      });
      if (allocation) return Response.success(allocation);

      return Response.failure(Messages.AllocationNotAvailable);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllAllocations(
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

      const [result, count] = await this.allocationRepo.findAndCount({
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
      return Response.failure(Messages.NoAllocationFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchAllocations(
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
        { allocationNumber: Like(`%${searchString}%`) },
        { status: Like(`%${searchString}%`) },
      ];

      if (filter.status) {
        query = [
          {
            allocationNumber: Like(`%${searchString}%`),
            status: filter.status,
          },
        ];
      }

      const [result, count] = await this.allocationRepo.findAndCount({
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
      return Response.failure(Messages.NoAllocationFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
