import { Announcement } from '../../schemas/announcement.schema';
import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { In, Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Helpers, Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import {
  ActionType,
  Audiance,
  NotificationCategory,
  NotificationPriority,
  StateStatus,
  UserRole,
} from 'src/enums';
import { ProducerService } from 'src/queue/producer.service';
import {
  AnnouncementDto,
  UpdateAnnouncementDto,
} from 'src/dtos/company/announcement.dto';
import { NotificationDto } from 'src/dtos/notification.dto';
import { Messages } from 'src/utils/messages/messages';

@Injectable()
export class AnnouncementService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(Announcement)
    private announcementRepo: Repository<Announcement>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly queueProducerService: ProducerService,
  ) {}

  // ======================================================
  // NOTIFICATION BUILDER — SAME PATTERN AS INVESTMENT
  // ======================================================
  private buildNotification(
    audience: string,
    subject: string,
    category: NotificationCategory,
  ): NotificationDto {
    return {
      from: 0,
      to: null,
      subject,
      category,
      audience,
      enableEmail: true,
      enableSMS: false,
      enableInApp: true,
      priority: NotificationPriority.MEDIUM,
    } as NotificationDto;
  }

  private isManagement(user: User): boolean {
    return Helpers.getManagementRoles().includes(user.role);
  }

  // ======================================================
  // CREATE ANNOUNCEMENT
  // ======================================================
  async addAnnouncement(
    authUser: User,
    requestDto: AnnouncementDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.isManagement(authUser))
        return Response.failure(Messages.NoPermission);

      const announcement = {
        ...requestDto,
        status: StateStatus.ACTIVE,
        createdById: authUser.id,
      } as Announcement;

      const created = await this.announcementRepo.save(announcement);

      // Send to audience only
      const notification = this.buildNotification(
        created.audience ?? Audiance.PUBLIC,
        `New Announcement: ${created.title}`,
        NotificationCategory.GENERAL,
      );

      await this.queueProducerService.publishNotification(notification);

      return Response.success(created);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ======================================================
  // UPDATE ANNOUNCEMENT
  // ======================================================
  async updateAnnouncement(
    id: number,
    authUser: User,
    requestDto: UpdateAnnouncementDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.isManagement(authUser))
        return Response.failure(Messages.NoPermission);

      const announcement = await this.announcementRepo.findOne({
        where: { id },
      });
      if (!announcement)
        return Response.failure(Messages.AnnouncementNotAvailable);

      const updatedRecord = {
        ...announcement,
        ...requestDto,
      } as Announcement;

      const history = {
        ...requestDto,
        actionType: ActionType.UPDATE,
        actionDate: new Date(),
        actionBy: authUser.id,
        actionByUser: authUser.name,
      };

      if (!updatedRecord.updateHistory) updatedRecord.updateHistory = [history];
      else updatedRecord.updateHistory.push(history);

      await this.announcementRepo.update({ id }, updatedRecord);

      const updated = await this.announcementRepo.findOne({ where: { id } });

      return Response.success(updated);
    } catch (ex) {
      return Response.failure(Messages.Exception);
    }
  }

  // ======================================================
  // DELETE ANNOUNCEMENT
  // ======================================================
  async deleteAnnouncement(id: number, authUser: User): Promise<ApiResponse> {
    try {
      if (!this.isManagement(authUser))
        return Response.failure(Messages.NoPermission);

      await this.announcementRepo.delete(id);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      return Response.failure(Messages.Exception);
    }
  }

  // ======================================================
  // LIST ANNOUNCEMENTS WITH ROLE FILTERING
  // ======================================================
  async findAllAnnouncements(
    authUser: User,
    page: number,
    limit: number,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      let where: any = {};

      // Non management only sees PUBLIC + their role
      if (!this.isManagement(authUser)) {
        where.status = StateStatus.ACTIVE;
        where.audience = In([authUser.role, Audiance.PUBLIC]);
      }

      const [result, count] = await this.announcementRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: size * skip,
      });

      if (!result.length) return Response.failure(Messages.NoAnnouncementFound);

      const analytic = {
        announcements: await this.announcementRepo.count(),
        views: Helpers.randomViews(),
        pinned: Helpers.randomPinned(),
      };

      return Response.success({
        analytic,
        page: result,
        size,
        currentPage: skip,
        totalPages: Math.ceil(count / size),
      });
    } catch (ex) {
      return Response.failure(Messages.Exception);
    }
  }

  // ======================================================
  // LIST PUBLIC ANNOUNCEMENTS
  // ======================================================
  async findAllPublicAnnouncements(
    page: number,
    limit: number,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const where = {
        status: StateStatus.ACTIVE,
        audience: Audiance.PUBLIC,
      };

      const [result, count] = await this.announcementRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: size * skip,
      });

      if (!result.length) return Response.failure(Messages.NoAnnouncementFound);

      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages: Math.ceil(count / size),
      });
    } catch (ex) {
      return Response.failure(Messages.Exception);
    }
  }

  // ======================================================
  // SEARCH ANNOUNCEMENTS
  // ======================================================
  async searchAnnouncements(
    authUser: User,
    page: number,
    limit: number,
    search: string,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const fields = ['title', 'description', 'action', 'actiontext'];

      let where = Helpers.buildSearchQuery(search, fields);

      if (!this.isManagement(authUser)) {
        if (Array.isArray(where)) {
          where = where.map((w) => ({
            ...w,
            status: StateStatus.ACTIVE,
            audience: In([authUser.role, Audiance.PUBLIC]),
          }));
        } else {
          where.status = StateStatus.ACTIVE;
          where.audience = In([authUser.role, Audiance.PUBLIC]);
        }
      }

      const [result, count] = await this.announcementRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
      });

      if (!result.length) return Response.failure(Messages.NoAnnouncementFound);

      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages: Math.ceil(count / size),
      });
    } catch (ex) {
      return Response.failure(Messages.Exception);
    }
  }

  // ======================================================
  // SEARCH PUBLIC ANNOUNCEMENTS
  // ======================================================
  async searchPublicAnnouncements(
    page: number,
    limit: number,
    search: string,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const fields = ['title', 'description', 'action', 'actiontext'];

      let where = Helpers.buildSearchQuery(search, fields);

      if (Array.isArray(where)) {
        where = where.map((w) => ({
          ...w,
          status: StateStatus.ACTIVE,
          audience: Audiance.PUBLIC,
        }));
      } else {
        where.status = StateStatus.ACTIVE;
        where.audience = Audiance.PUBLIC;
      }

      const [result, count] = await this.announcementRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: size * skip,
      });

      if (!result.length) return Response.failure(Messages.NoAnnouncementFound);

      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages: Math.ceil(count / size),
      });
    } catch (ex) {
      return Response.failure(Messages.Exception);
    }
  }
}
