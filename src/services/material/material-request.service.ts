import { MaterialRequest } from '../../schemas/inventory/material-request.schema';
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
  MaterialRequestDto,
  MaterialRequestItemDto,
  UpdateMaterialRequestDto,
} from 'src/dtos/material.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { Material } from 'src/schemas/inventory/material.schema';
import { Estate } from 'src/schemas/property/estate.schema';
import { NotificationDto } from 'src/dtos/notification.dto';
import { ProducerService } from 'src/queue/producer.service';
@Injectable()
export class MaterialRequestService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(MaterialRequest)
    private materialRequestRepo: Repository<MaterialRequest>,
    @InjectRepository(Material) private materialRepo: Repository<Material>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Estate) private estateRepo: Repository<Estate>,
    private readonly queueProducerService: ProducerService,
  ) {}

  async addMaterialRequest(
    authenticatedUser: User,
    requestDto: MaterialRequestDto,
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
      } as unknown as MaterialRequest;

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

  async updateMaterialRequest(
    materialRequestId: number,
    authenticatedUser: User,
    requestDto: UpdateMaterialRequestDto,
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
        return Response.failure(Messages.MaterialRequestNotAvailable);

      if (materialRequest.status == StateStatus.RELEASED) {
        return Response.failure(Messages.CantModifyReleasedRequest);
      }

      const updateRequest = {
        ...materialRequest,
        ...requestDto,
      } as MaterialRequest;

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

  async updateMaterialRequestStatus(
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
        return Response.failure(Messages.MaterialRequestNotAvailable);

      const requester = materialRequest.createdBy;

      if (status === StateStatus.APPROVED) {
        if (materialRequest.status != StateStatus.PENDING)
          return Response.failure(Messages.MaterialRequestNotInPendingState);

        materialRequest.approverId = authenticatedUser.id;
        materialRequest.status = StateStatus.APPROVED;
        const saved = await this.materialRequestRepo.save(materialRequest);

        const notification: NotificationDto = {
          from: 0,
          to: requester, // the user who made the request
          subject: 'Material Request Approved',
          body: `Hello ${requester.name},
Your material request has been approved.`,
          category: NotificationCategory.STATUSCHANGE,
          date: new Date(),
          enableEmail: true,
          enableSMS: false,
          enableInApp: true,
          priority: NotificationPriority.MEDIUM,
        } as unknown as NotificationDto;

        this.queueProducerService.publishNotification(notification);

        return Response.success(saved);
      } else if (status === StateStatus.RELEASED) {
        const requestStatuses = [];
        const selectedMaterials = [];

        if (materialRequest.status != StateStatus.APPROVED)
          return Response.failure(Messages.MaterialRequestNotInApprovedState);

        //material availablity check
        for (var i = 0; i < materialRequest.materials.length; i++) {
          let materialData = materialRequest.materials[
            i
          ] as MaterialRequestItemDto;
          const material = await this.materialRepo.findOne({
            where: { id: materialData.materialId },
          });
          if (!material) {
            requestStatuses.push({
              ...materialData,
              success: false,
              message: `${materialData.materialName} not available`,
            });
          } else {
            if (
              material.status == StateStatus.ACTIVE &&
              material.quantityLeft == 0
            ) {
              //its aggregate
              materialRequest.releasedById = authenticatedUser.id;
              materialRequest.status = StateStatus.RELEASED;

              const notification: NotificationDto = {
                from: 0,
                to: requester, // the user who made the request
                subject: 'Material Request Released',
                body: `Hello ${requester.name},
The materials you requested has been released.`,
                category: NotificationCategory.STATUSCHANGE,
                date: new Date(),
                enableEmail: true,
                enableSMS: false,
                enableInApp: true,
                priority: NotificationPriority.MEDIUM,
              } as unknown as NotificationDto;

              this.queueProducerService.publishNotification(notification);
            } else {
              if (material.quantityLeft <= materialData.quantity) {
                requestStatuses.push({
                  ...materialData,
                  success: false,
                  message: `${materialData.materialName} not available, you  are trying to request for ${materialData.quantity} ${materialData.materialName} and we have ${material.quantityLeft} at the moment`,
                });
              } else {
                materialRequest.releasedById = authenticatedUser.id;
                materialRequest.status = StateStatus.RELEASED;
                material.quantityLeft =
                  material.quantityLeft - materialData.quantity;
                selectedMaterials.push(material);

                const notification: NotificationDto = {
                  from: 0,
                  to: requester, // the user who made the request
                  subject: 'Material Request Released',
                  body: `Hello ${requester.name},
The materials you requested has been released.`,
                  category: NotificationCategory.STATUSCHANGE,
                  date: new Date(),
                  enableEmail: true,
                  enableSMS: false,
                  enableInApp: true,
                  priority: NotificationPriority.MEDIUM,
                } as unknown as NotificationDto;

                this.queueProducerService.publishNotification(notification);
              }
            }
          }
        }

        const passed = requestStatuses.filter(
          (response) => response.success == false,
        );
        if (passed.length > 0) {
          return Response.fail('Request failed', requestStatuses);
        } else {
          this.materialRepo.save(selectedMaterials);
          const saved = await this.materialRequestRepo.save(materialRequest);
          return Response.success(saved);
        }
      } else if (status === StateStatus.DECLINED) {
        materialRequest.approverId = authenticatedUser.id;
        materialRequest.status = StateStatus.DECLINED;

        const notification: NotificationDto = {
          from: 0,
          to: requester, // the user who made the request
          subject: 'Material Request Declined',
          body: `Hello ${requester.name},
Your material request has been declined.`,
          category: NotificationCategory.STATUSCHANGE,
          date: new Date(),
          enableEmail: true,
          enableSMS: false,
          enableInApp: true,
          priority: NotificationPriority.MEDIUM,
        } as unknown as NotificationDto;
        this.queueProducerService.publishNotification(notification);
        const saved = await this.materialRequestRepo.save(materialRequest);
        return Response.success(saved);
      } else {
        return Response.failure(Messages.UnableToUpdateRequestStatus);
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteMaterialRequest(
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
        return Response.failure(Messages.MaterialRequestNotAvailable);

      if (materialRequest.status == StateStatus.RELEASED)
        return Response.failure(Messages.CantDeleteReleasedRequest);

      await this.materialRequestRepo.delete(materialRequestId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findMaterialRequestById(materialId: number) {
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
    return Response.failure(Messages.MaterialRequestNotAvailable);
  }

  async findAllMaterialRequests(
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
          materialRequests:
            authenticatedUser.role == UserRole.SITEENGINEER
              ? await this.materialRequestRepo.count({
                  where: {
                    createdById: authenticatedUser.id,
                  },
                })
              : await this.materialRequestRepo.count(),
          declinedMaterialRequests:
            authenticatedUser.role == UserRole.SITEENGINEER
              ? await this.materialRequestRepo.count({
                  where: {
                    createdById: authenticatedUser.id,
                    status: StateStatus.DECLINED,
                  },
                })
              : await this.materialRequestRepo.count({
                  where: { status: StateStatus.DECLINED },
                }),
          approvedMaterialRequests:
            authenticatedUser.role == UserRole.SITEENGINEER
              ? await this.materialRequestRepo.count({
                  where: {
                    createdById: authenticatedUser.id,
                    status: StateStatus.APPROVED,
                  },
                })
              : await this.materialRequestRepo.count({
                  where: { status: StateStatus.APPROVED },
                }),
          releasedMaterialRequests:
            authenticatedUser.role == UserRole.SITEENGINEER
              ? await this.materialRequestRepo.count({
                  where: {
                    createdById: authenticatedUser.id,
                    status: StateStatus.RELEASED,
                  },
                })
              : await this.materialRequestRepo.count({
                  where: { status: StateStatus.RELEASED },
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
      return Response.failure(Messages.NoMaterialRequestFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchMaterialRequests(
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
      return Response.failure(Messages.NoMaterialRequestFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
