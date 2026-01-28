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
  Department,
  LocationType,
  NotificationCategory,
  NotificationPriority,
  StateStatus,
  UserRole,
} from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import { ComplaintDto, UpdateComplaintDto } from 'src/dtos/complaint.dto';
import { Complaint } from 'src/schemas/complaint.schema';
import { NotificationDto } from 'src/dtos/notification.dto';
import { FilterDto } from 'src/dtos/filter.dto';
import { UpdateStatusDto } from 'src/dtos/master';
import { Estate } from 'src/schemas/property/estate.schema';
import { Layout } from 'src/schemas/property/layout.schema';

@Injectable()
export class ComplaintService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Complaint) private complaintRepo: Repository<Complaint>,
    @InjectRepository(Layout) private layoutRepo: Repository<Layout>,
    @InjectRepository(Estate) private estateRepo: Repository<Estate>,
    private readonly queueProducerService: ProducerService,
  ) {}

  private async getLocationByType(
    type: LocationType,
    id: number,
  ): Promise<Layout | Estate | null> {
    if (type === LocationType.ESTATE) {
      return this.estateRepo.findOne({
        where: { id },
      });
    }
    if (type === LocationType.LAYOUT) {
      return this.layoutRepo.findOne({
        where: { id },
      });
    }
    return null;
  }

  async addComplaint(
    authenticatedUser: User,
    requestDto: ComplaintDto,
  ): Promise<ApiResponse> {
    try {
      const location = await this.getLocationByType(
        requestDto.locationType,
        requestDto.locationId,
      );

      const request = {
        ...requestDto,
        layoutId:
          location && requestDto.locationType == LocationType.LAYOUT
            ? location.id
            : null,
        estateId:
          location && requestDto.locationType == LocationType.ESTATE
            ? location.id
            : null,
        code: Helpers.getCode(),
        status: StateStatus.PENDING,
        createdById: authenticatedUser.id,
      } as unknown as Complaint;

      const savedComplaint = await this.complaintRepo.save(request);
      if (savedComplaint) {
        const notification: NotificationDto = {
          from: 0,
          to: authenticatedUser,
          subject: 'Complaint Submitted Successfully',
          body: `Hello ${authenticatedUser.name},

Your complaint has been successfully submitted.

The ${
            savedComplaint.department == Department.ENGINEERING
              ? 'engineering head'
              : savedComplaint.department == Department.MANAGEMENT
                ? 'management'
                : savedComplaint.department == Department.MARKETING
                  ? 'marketinng department'
                  : 'support team'
          } will review your complaint and take the necessary steps to resolve the issue. You will be notified once there is an update.

Thank you for bringing this to our attention.`,
          category: NotificationCategory.STATUSCHANGE,
          date: new Date().toISOString(),
          enableEmail: true,
          enableSMS: true,
          enableInApp: false,
          priority: NotificationPriority.HIGH,
        } as unknown as NotificationDto;

        this.queueProducerService.publishNotification(notification);

        return Response.success(savedComplaint);
      } else {
        return Response.failure('Unable to add complaint');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateComplaint(
    complaintId: number,
    authenticatedUser: User,
    requestDto: UpdateComplaintDto,
  ): Promise<ApiResponse> {
    try {
      const complaint = await this.complaintRepo.findOne({
        where: { id: complaintId },
      });
      if (!complaint) return Response.failure(Messages.ComplaintNotAvailable);

      const updateRequest = {
        ...complaint,
        ...requestDto,
      } as Complaint;

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

      await this.complaintRepo.update({ id: complaintId }, updateRequest);
      const updatedUser = await this.complaintRepo.findOne({
        where: { id: complaintId },
      });
      return Response.success(updatedUser);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async changeComplaintStatus(
    authenticatedUser: User,
    complaintId: number,
    request: UpdateStatusDto,
  ): Promise<ApiResponse> {
    try {
      const complaint = await this.complaintRepo.findOne({
        where: { id: complaintId },
        relations: { createdBy: true },
      });

      if (!complaint) return Response.failure(Messages.ComplaintNotFound);

      let subject: string;
      let messageBody: string;

      switch (request.status) {
        case StateStatus.APPROVED:
          complaint.status = StateStatus.APPROVED;
          subject = 'Complaint Approved';
          messageBody =
            'Your complaint has been reviewed and approved. We will begin necessary actions shortly.';
          break;

        case StateStatus.DECLINED:
          complaint.status = StateStatus.DECLINED;
          subject = 'Complaint Declined';
          messageBody =
            'Your complaint has been reviewed and unfortunately cannot be acted upon at this time.';
          break;

        case StateStatus.RESOLVED:
          complaint.status = StateStatus.RESOLVED;
          subject = 'Complaint Resolved';
          messageBody =
            'We are pleased to inform you that your complaint has been resolved successfully.';
          break;

        case StateStatus.INPROGRESS:
          complaint.status = StateStatus.INPROGRESS;
          subject = 'Complaint In Progress';
          messageBody =
            'Your complaint is currently being worked on. We will keep you updated on progress.';
          break;

        default:
          return Response.failure(Messages.InvalidStatus);
      }

      // Append update history
      const history = {
        status: request.status,
        statusReason: request.statusReason,
        actionBy: authenticatedUser.id,
        actionByUser: authenticatedUser.name,
        actionDate: new Date(),
      };

      complaint.updateHistory = complaint.updateHistory || [];
      complaint.updateHistory.push(history);

      await this.complaintRepo.save(complaint);

      const user = complaint.createdBy;
      const fullMessage = `${messageBody}\n\nAdditional remarks:\n${
        request.statusReason || 'None'
      }`;

      const notification: NotificationDto = {
        from: 0,
        to: user,
        subject,
        body: fullMessage,
        category: NotificationCategory.STATUSCHANGE,
        date: new Date(),
        enableEmail: true,
        enableSMS: true,
        enableInApp: false,
        priority: NotificationPriority.HIGH,
      } as unknown as NotificationDto;

      this.queueProducerService.publishNotification(notification);

      return Response.success('Complaint status updated successfully');
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async getComplaintById(
    authenticatedUser: User,
    complaintId: number,
  ): Promise<ApiResponse> {
    try {
      const complaint = await this.complaintRepo.findOne({
        where: { id: complaintId },
        relations: { createdBy: true, layout: true, estate: true },
      });
      if (complaint) return Response.success(complaint);
      return Response.failure(Messages.ComplaintNotAvailable);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteComplaint(
    authenticatedUser: User,
    complaintId: number,
  ): Promise<ApiResponse> {
    try {
      await this.complaintRepo.delete(complaintId);

      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllComplaints(
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

      if (filter.userId) {
        query.createdById = filter.userId;
      } else {
        switch (authenticatedUser.role) {
          case UserRole.MANAGER:
            query.department = Department.MANAGEMENT;
            break;
          case UserRole.LEADENGINEER:
            query.department = Department.ENGINEERING;
            break;
          case UserRole.CUSTOMERCARE:
            query.department = Department.MARKETING;
            break;
        }
      }

      if (
        !filter.userId &&
        !['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(authenticatedUser.role) &&
        !query.department
      ) {
        query.createdById = authenticatedUser.id;
      }

      const [result, count] = await this.complaintRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        relations: { createdBy: true, layout: true, estate: true },
        take: size,
        skip: skip * size,
      });

      if (result.length) {
        const totalPages = Math.ceil(count / size);
        const analytic = {
          pending: await this.complaintRepo.count({
            where: { status: StateStatus.PENDING },
          }),
          approved: await this.complaintRepo.count({
            where: { status: StateStatus.APPROVED },
          }),
          inProgress: await this.complaintRepo.count({
            where: { status: StateStatus.INPROGRESS },
          }),
          resolved: await this.complaintRepo.count({
            where: { status: StateStatus.RESOLVED },
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

      return Response.failure(Messages.NoComplaintFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchComplaints(
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

      // Role-based filtering
      if (filter.userId) baseConditions.createdById = filter.userId;
      else if (authenticatedUser.role == UserRole.MANAGER)
        baseConditions.department = Department.MANAGEMENT;
      else if (authenticatedUser.role == UserRole.LEADENGINEER)
        baseConditions.department = Department.ENGINEERING;
      else if (authenticatedUser.role == UserRole.CUSTOMERCARE)
        baseConditions.department = Department.MARKETING;

      if (
        !filter.userId &&
        !['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(authenticatedUser.role) &&
        !baseConditions.department
      ) {
        baseConditions.createdById = authenticatedUser.id;
      }

      // Search logic (OR-based)
      const searchConditions = searchString
        ? [
            { ...baseConditions, title: Like(`%${searchString}%`) },
            { ...baseConditions, description: Like(`%${searchString}%`) },
            { ...baseConditions, status: Like(`%${searchString}%`) },
          ]
        : [baseConditions];

      const [result, count] = await this.complaintRepo.findAndCount({
        where: searchConditions,
        order: { createdAt: 'DESC' },
        relations: { createdBy: true, layout: true, estate: true },
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
      return Response.failure(Messages.NoComplaintFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
