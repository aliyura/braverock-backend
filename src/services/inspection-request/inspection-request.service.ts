import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import {
  ActionType,
  NotificationCategory,
  NotificationPriority,
  PropertyType,
  StateStatus,
} from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import { NotificationDto } from 'src/dtos/notification.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import {
  InspectionRequestDto,
  UpdateInspectionRequestDto,
} from 'src/dtos/property/inspection-request.dto';
import { UpdateStatusDto } from 'src/dtos/master';
import { InspectionRequest } from 'src/schemas/property/inspection-request.schema';
import { House } from 'src/schemas/property/house.schema';
import { Plot } from 'src/schemas/property/plot.schema';

@Injectable()
export class InspectionRequestService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(InspectionRequest)
    private inspectionRequestRepo: Repository<InspectionRequest>,
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
        relations: { layout: true, estate: true },
      });
    }
    return null;
  }

  async addInspectionRequest(
    requestDto: InspectionRequestDto,
    authenticatedUser?: User,
  ): Promise<ApiResponse> {
    try {
      const property = (await this.getPropertyByType(
        requestDto.propertyType,
        requestDto.propertyId,
      )) as Plot | House | any;
      if (!property) return Response.failure(Messages.PropertyNotFound);

      const request = {
        ...requestDto,
        propertyLocation: property.estate
          ? property.estate.name
          : property.layout
            ? property.layout.name
            : 'Standalone',
        houseId:
          requestDto.propertyType == PropertyType.HOUSE ? property.id : null,
        plotId:
          requestDto.propertyType == PropertyType.PLOT ? property.id : null,
        status: StateStatus.PENDING,
      } as unknown as InspectionRequest;

      if (authenticatedUser) request.createdById = authenticatedUser.id;

      const savedInspectionRequest =
        await this.inspectionRequestRepo.save(request);
      if (savedInspectionRequest) {
        const notification: NotificationDto = {
          from: 0,
          to: {
            name: requestDto.name,
            emailAddress: requestDto.emailAddress,
            phoneNumber: requestDto.phoneNumber,
          } as User,
          subject: 'House Inspection Request Submitted',
          body: `Hello ${requestDto.name},

Your property inspection request has been successfully submitted.

Our team will review your request and contact you shortly to confirm the details.

Thank you for choosing Realta.`,
          category: NotificationCategory.STATUSCHANGE,
          date: new Date().toISOString(),
          enableEmail: true,
          enableSMS: true,
          enableInApp: false,
          priority: NotificationPriority.HIGH,
        } as unknown as NotificationDto;
        this.queueProducerService.publishNotification(notification);

        return Response.success(savedInspectionRequest);
      } else {
        return Response.failure('Unable to add inspection request');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateInspectionRequest(
    inspectionRequestId: number,
    authenticatedUser: User,
    requestDto: UpdateInspectionRequestDto,
  ): Promise<ApiResponse> {
    try {
      const inspectionRequest = await this.inspectionRequestRepo.findOne({
        where: { id: inspectionRequestId },
      });
      if (!inspectionRequest)
        return Response.failure(Messages.InspectionRequestNotAvailable);

      const updateRequest = {
        ...inspectionRequest,
        ...requestDto,
      } as InspectionRequest;

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

      await this.inspectionRequestRepo.update(
        { id: inspectionRequestId },
        updateRequest,
      );
      const updatedUser = await this.inspectionRequestRepo.findOne({
        where: { id: inspectionRequestId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async changeInspectionRequestStatus(
    authenticatedUser: User,
    inspectionRequestId: number,
    request: UpdateStatusDto,
  ): Promise<ApiResponse> {
    try {
      const inspectionRequest = await this.inspectionRequestRepo.findOne({
        where: { id: inspectionRequestId },
        relations: { createdBy: true },
      });

      if (!inspectionRequest)
        return Response.failure(Messages.InspectionRequestNotFound);

      let subject: string;
      let messageBody: string;

      switch (request.status) {
        case StateStatus.APPROVED:
          inspectionRequest.status = StateStatus.APPROVED;
          subject = 'Inspection Request Approved';
          messageBody = `Your inspection request has been approved.`;
          break;

        case StateStatus.DECLINED:
          inspectionRequest.status = StateStatus.DECLINED;
          subject = 'Inspection Request Declined';
          messageBody = `Your inspection request has been declined.`;
          break;

        case StateStatus.COMPLETED:
          inspectionRequest.status = StateStatus.COMPLETED;
          subject = 'Inspection Completed Successfully';
          messageBody = `Hello ${inspectionRequest.name},

We’re pleased to inform you that your property site inspection has been completed successfully.

Thank you for your time and cooperation during the process. If you have any follow-up questions or need further assistance, feel free to reach out.`;
          break;
        default:
          return Response.failure(Messages.InvalidStatus);
      }

      await this.inspectionRequestRepo.save(inspectionRequest);

      const user = inspectionRequest.createdBy;
      const fullMessage = `${messageBody}\n\nAdditional remarks:\n${
        request.statusReason || 'None'
      }`;

      const notification: NotificationDto = {
        from: 0,
        to: user,
        subject,
        body: fullMessage,
        category: NotificationCategory.STATUSCHANGE,
        date: new Date().toISOString(),
        enableEmail: true,
        enableSMS: true,
        enableInApp: false,
        priority: NotificationPriority.HIGH,
      } as unknown as NotificationDto;

      this.queueProducerService.publishNotification(notification);

      return Response.success('Inspection request status updated successfully');
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getInspectionRequestById(
    authenticatedUser: User,
    inspectionRequestId: number,
  ): Promise<ApiResponse> {
    try {
      const inspectionRequest = await this.inspectionRequestRepo.findOne({
        where: { id: inspectionRequestId },
        relations: { createdBy: true, plot: true, house: true },
      });
      if (inspectionRequest) return Response.success(inspectionRequest);
      return Response.failure(Messages.InspectionRequestNotAvailable);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteInspectionRequest(
    authenticatedUser: User,
    inspectionRequestId: number,
  ): Promise<ApiResponse> {
    try {
      await this.inspectionRequestRepo.delete(inspectionRequestId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllInspectionRequests(
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

      const query: any = {};

      if (filter.status) query.status = filter.status;
      if (filter.userId) query.createdById = filter.userId;

      const [result, count] = await this.inspectionRequestRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        relations: { createdBy: true, plot: true, house: true },
        take: size,
        skip: skip * size,
      });

      if (result.length) {
        const totalPages = Math.ceil(count / size);
        const analytic = {
          pendingRequests: await this.inspectionRequestRepo.count({
            where: { status: StateStatus.PENDING },
          }),
          approvedRequests: await this.inspectionRequestRepo.count({
            where: { status: StateStatus.APPROVED },
          }),
          rescheduledRequests: await this.inspectionRequestRepo.count({
            where: { status: StateStatus.RESCHEDULED },
          }),
          completedRequests: await this.inspectionRequestRepo.count({
            where: { status: StateStatus.COMPLETED },
          }),
        };
        return Response.success({
          analytic,
          page: result,
          size,
          currentPage: skip,
          totalPages: totalPages > 0 ? totalPages : 1,
        });
      }

      return Response.failure(Messages.NoInspectionRequestFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchInspectionRequests(
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

      const baseConditions: any = {};

      if (filter.userId) baseConditions.createdById = filter.userId;
      if (filter.status) baseConditions.status = filter.status;

      const searchConditions = searchString
        ? [
            { ...baseConditions, name: Like(`%${searchString}%`) },
            { ...baseConditions, emailAddress: Like(`%${searchString}%`) },
            { ...baseConditions, phoneNumber: Like(`%${searchString}%`) },
            { ...baseConditions, message: Like(`%${searchString}%`) },
            { ...baseConditions, status: Like(`%${searchString}%`) },
          ]
        : [baseConditions];

      const [result, count] = await this.inspectionRequestRepo.findAndCount({
        where: searchConditions,
        order: { createdAt: 'DESC' },
        relations: { createdBy: true, plot: true, house: true },
        take: size,
        skip: skip * size,
      });

      if (result.length) {
        const totalPages = Math.ceil(count / size);
        return Response.success({
          page: result,
          size: size,
          currentPage: Number(skip),
          totalPages: totalPages > 0 ? totalPages : 1,
        });
      }
      return Response.failure(Messages.NoInspectionRequestFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
