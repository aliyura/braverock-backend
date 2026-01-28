import { MaterialSupplyRequest } from '../../schemas/inventory/material-supply-request.schema';
import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Between, In, Like, Repository } from 'typeorm';
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

import {
  MaterialSupplyRequestDto,
  MaterialSupplyRequestItemDto,
  UpdateMaterialSupplyRequestDto,
} from 'src/dtos/material.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { Material } from 'src/schemas/inventory/material.schema';
import { Estate } from 'src/schemas/property/estate.schema';
import { NotificationDto } from 'src/dtos/notification.dto';
import { ProducerService } from 'src/queue/producer.service';
@Injectable()
export class MaterialSupplyRequestService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(MaterialSupplyRequest)
    private materialRequestRepo: Repository<MaterialSupplyRequest>,
    @InjectRepository(Material) private materialRepo: Repository<Material>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Estate) private estateRepo: Repository<Estate>,
    private readonly queueProducerService: ProducerService,
  ) {}

  async addMaterialSupplyRequest(
    authenticatedUser: User,
    requestDto: MaterialSupplyRequestDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.STOREKEEPER &&
        authenticatedUser.role != UserRole.SITEENGINEER &&
        authenticatedUser.role != UserRole.LEADENGINEER
      )
        return Response.failure(Messages.NoPermission);

      const estate = await this.estateRepo.findOne({
        where: { id: requestDto.estateId },
        relations: { engineer: true },
      });
      if (!estate) return Response.failure(Messages.EstateNotAvailable);

      let siteEngineer;
      if (estate.engineerId) {
        siteEngineer = await this.userRepo.findOne({
          where: { id: estate.engineerId },
        });
      }
      if (!siteEngineer)
        return Response.failure(Messages.NoSiteEngineerAssigned);

      const request = {
        ...requestDto,
        name: siteEngineer.name,
        phoneNumber: estate.engineer.phoneNumber,
        status:
          authenticatedUser.role == UserRole.LEADENGINEER
            ? StateStatus.APPROVED
            : StateStatus.PENDING,
        releasedById: authenticatedUser.id,
        createdById: authenticatedUser.id,
      } as unknown as MaterialSupplyRequest;

      const created = await this.materialRequestRepo.save(request);
      if (created) {
        return Response.success(created);
      } else {
        return Response.failure('Unable to submit material request');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateMaterialSupplyRequest(
    materialRequestId: number,
    authenticatedUser: User,
    requestDto: UpdateMaterialSupplyRequestDto,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.STOREKEEPER &&
        authenticatedUser.role != UserRole.SITEENGINEER &&
        authenticatedUser.role != UserRole.LEADENGINEER
      )
        return Response.failure(Messages.NoPermission);

      const materialRequest = await this.materialRequestRepo.findOne({
        where: { id: materialRequestId },
      });
      if (!materialRequest)
        return Response.failure(Messages.MaterialSupplyRequestNotAvailable);

      if (materialRequest.status == StateStatus.SUPPLIED) {
        return Response.failure(Messages.CantModifySuppliedRequest);
      }

      const updateRequest = {
        ...materialRequest,
        ...requestDto,
      } as MaterialSupplyRequest;

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

      await this.materialRequestRepo.update(
        { id: materialRequestId },
        updateRequest,
      );
      const updatedUser = await this.materialRequestRepo.findOne({
        where: { id: materialRequestId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateMaterialSupplyRequestStatus(
    materialRequestId: number,
    authenticatedUser: User,
    status: string,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SUPERADMIN &&
        authenticatedUser.role != UserRole.STOREKEEPER &&
        authenticatedUser.role != UserRole.LEADENGINEER &&
        authenticatedUser.role != UserRole.MANAGER
      )
        return Response.failure(Messages.NoPermission);

      const materialRequest = await this.materialRequestRepo.findOne({
        where: { id: materialRequestId },
        relations: { createdBy: true },
      });
      if (!materialRequest)
        return Response.failure(Messages.MaterialSupplyRequestNotAvailable);

      const requester = materialRequest.createdBy;

      if (status === StateStatus.APPROVED) {
        if (authenticatedUser.role == UserRole.STOREKEEPER)
          return Response.failure(Messages.NoPermission);

        if (materialRequest.status != StateStatus.PENDING)
          return Response.failure(
            Messages.MaterialSupplyRequestNotInPendingState,
          );

        materialRequest.approverId = authenticatedUser.id;
        materialRequest.status = StateStatus.APPROVED;
        const saved = await this.materialRequestRepo.save(materialRequest);

        const notification: NotificationDto = {
          from: 0,
          to: requester, // the user who made the request
          subject: 'Material Supply Request Approved',
          body: `Hello ${requester.name},
Your material supply request has been approved.`,
          category: NotificationCategory.STATUSCHANGE,
          date: new Date(),
          enableEmail: true,
          enableSMS: false,
          enableInApp: true,
          priority: NotificationPriority.MEDIUM,
        } as unknown as NotificationDto;

        this.queueProducerService.publishNotification(notification);

        return Response.success(saved);
      } else if (status === StateStatus.SUPPLIED) {
        if (materialRequest.status != StateStatus.APPROVED)
          return Response.failure(
            Messages.MaterialSupplyRequestNotInApprovedState,
          );

        materialRequest.releasedById = authenticatedUser.id;
        materialRequest.status = StateStatus.RELEASED;
        const saved = await this.materialRequestRepo.save(materialRequest);

        const notification: NotificationDto = {
          from: 0,
          to: requester, // the user who made the request
          subject: 'Material Supply Request Completed',
          body: `Hello ${requester.name},
The material supply request you submmited has been fully completed.`,
          category: NotificationCategory.STATUSCHANGE,
          date: new Date(),
          enableEmail: true,
          enableSMS: false,
          enableInApp: true,
          priority: NotificationPriority.MEDIUM,
        } as unknown as NotificationDto;

        this.queueProducerService.publishNotification(notification);
        return Response.success(saved);
      } else if (status === StateStatus.DECLINED) {
        materialRequest.approverId = authenticatedUser.id;
        materialRequest.status = StateStatus.DECLINED;

        const notification: NotificationDto = {
          from: 0,
          to: requester, // the user who made the request
          subject: 'Material Supply Request Declined',
          body: `Hello ${requester.name},
Your material supply request has been declined.`,
          category: NotificationCategory.STATUSCHANGE,
          date: new Date(),
          enableEmail: true,
          enableSMS: false,
          enableInApp: true,
          priority: NotificationPriority.MEDIUM,
        } as unknown as NotificationDto;
        this.queueProducerService.publishNotification(notification);
      } else {
        return Response.failure(Messages.UnableToUpdateRequestStatus);
      }
      this.materialRequestRepo.save(materialRequest);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteMaterialSupplyRequest(
    materialRequestId: number,
    authenticatedUser: User,
  ): Promise<ApiResponse> {
    try {
      if (
        authenticatedUser.role != UserRole.ADMIN &&
        authenticatedUser.role != UserRole.SITEENGINEER &&
        authenticatedUser.role != UserRole.STOREKEEPER &&
        authenticatedUser.role != UserRole.LEADENGINEER
      )
        return Response.failure(Messages.NoPermission);

      const materialRequest = await this.materialRequestRepo.findOne({
        where: { id: materialRequestId },
      });
      if (!materialRequest)
        return Response.failure(Messages.MaterialSupplyRequestNotAvailable);

      if (materialRequest.status == StateStatus.RELEASED)
        return Response.failure(Messages.CantDeleteReleasedRequest);

      await this.materialRequestRepo.delete(materialRequestId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findMaterialSupplyRequestById(materialId: number) {
    const result = await this.materialRequestRepo.findOne({
      where: { id: materialId },
      relations: {
        createdBy: true,
        estate: true,
        releasedBy: true,
        approver: true,
      },
    });
    if (result) return Response.success(result);
    return Response.failure(Messages.MaterialSupplyRequestNotAvailable);
  }

  async findAllMaterialSupplyRequests(
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

      if (filter.estateId) query.estateId = filter.estateId;
      if (filter.status) query.status = filter.status;

      if (authenticatedUser.role == UserRole.SITEENGINEER)
        query.createdById = authenticatedUser.id;

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
      const [result, count] = await this.materialRequestRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
        relations: { estate: true },
      });

      if (result.length) {
        const totalPages = Math.round(count / size);
        const analytic = {
          materialSupplyRequests:
            authenticatedUser.role == UserRole.SITEENGINEER
              ? await this.materialRequestRepo.count({
                  where: {
                    createdById: authenticatedUser.id,
                  },
                })
              : await this.materialRequestRepo.count(),
          declinedMaterialSupplyRequests:
            authenticatedUser.role == UserRole.STOREKEEPER
              ? await this.materialRequestRepo.count({
                  where: {
                    createdById: authenticatedUser.id,
                    status: StateStatus.DECLINED,
                  },
                })
              : await this.materialRequestRepo.count({
                  where: { status: StateStatus.DECLINED },
                }),
          approvedMaterialSupplyRequests:
            authenticatedUser.role == UserRole.STOREKEEPER
              ? await this.materialRequestRepo.count({
                  where: {
                    createdById: authenticatedUser.id,
                    status: StateStatus.APPROVED,
                  },
                })
              : await this.materialRequestRepo.count({
                  where: { status: StateStatus.APPROVED },
                }),
          completedMaterialSupplyRequests:
            authenticatedUser.role == UserRole.STOREKEEPER
              ? await this.materialRequestRepo.count({
                  where: {
                    createdById: authenticatedUser.id,
                    status: StateStatus.SUPPLIED,
                  },
                })
              : await this.materialRequestRepo.count({
                  where: { status: StateStatus.SUPPLIED },
                }),
        };

        return Response.success({
          analytic,
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
      return Response.failure(Messages.NoMaterialSupplyRequestFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchMaterialSupplyRequests(
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

      var query = [] as any;
      query = [
        { name: Like(`%${searchString}%`) },
        { phoneNumber: Like(`%${searchString}%`) },
        { estateId: Like(`%${searchString}%`) },
      ];

      if (authenticatedUser.role == UserRole.SITEENGINEER) {
        query = [
          {
            name: Like(`%${searchString}%`),
            createdById: authenticatedUser.id,
          },
          {
            phoneNumber: Like(`%${searchString}%`),
            createdById: authenticatedUser.id,
          },
          {
            estateId: Like(`%${searchString}%`),
            createdById: authenticatedUser.id,
          },
        ];
      }

      const [result, count] = await this.materialRequestRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
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
      return Response.failure(Messages.NoMaterialSupplyRequestFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
