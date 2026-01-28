import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { Response, Helpers } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';

import { User } from 'src/schemas/user.schema';
import { News } from 'src/schemas/company/news.schema';
import { NewsSubscription } from 'src/schemas/company/news-subscription.schema';

import {
  ActionType,
  NotificationCategory,
  NotificationPriority,
  StateStatus,
  UserRole,
} from 'src/enums';

import { NewsDto, NewsletterDto, UpdateNewsDto } from 'src/dtos/company/news.dto';

import { ProducerService } from 'src/queue/producer.service';
import { NotificationDto } from 'src/dtos/notification.dto';

@Injectable()
export class NewsService {
  cache = new NodeCache();

  constructor(
    @InjectRepository(News)
    private readonly newsRepo: Repository<News>,
    @InjectRepository(NewsSubscription)
    private readonly newsSubscriptionRepo: Repository<NewsSubscription>,
    private readonly queueProducerService: ProducerService,
  ) {}

  // ======================================================
  // PRIVATE HELPERS
  // ======================================================

  private buildNotification(
    audience: string,
    subject: string,
    category: NotificationCategory,
  ): NotificationDto {
    return {
      from: 0,
      to: { role: audience } as any, // Notification service resolves target users
      subject,
      category,
      enableEmail: true,
      enableSMS: true,
      enableInApp: true,
      priority: NotificationPriority.MEDIUM,
    } as NotificationDto;
  }

  private isManagement(user: User): boolean {
    return Helpers.getManagementRoles().includes(user.role);
  }

  private appendHistory(entity: any, payload: any, user: User) {
    const history = {
      ...payload,
      actionType: ActionType.UPDATE,
      actionDate: new Date(),
      actionBy: user.id,
      actionByUser: user.name,
    };

    if (!entity.updateHistory) entity.updateHistory = [history];
    else entity.updateHistory.push(history);

    return entity;
  }

  // ======================================================
  // ADD NEWS
  // ======================================================

  async addNews(
    authenticatedUser: User,
    requestDto: NewsDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.isManagement(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const request = this.newsRepo.create({
        ...requestDto,
        status: StateStatus.ACTIVE,
        createdById: authenticatedUser.id,
      });

      const saved = await this.newsRepo.save(request);

      // Build notification
      const audience = requestDto.audience || 'PUBLIC';

      const notification = this.buildNotification(
        audience,
        `New Article: ${requestDto.title}`,
        NotificationCategory.NEWS,
      );

      await this.queueProducerService.publishNotification(notification);

      return Response.success(saved);
    } catch (ex) {
      console.log('Exception:', ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ======================================================
  // NEWSLETTER
  // ======================================================

  async AddNewsletterSubscription(
    requestDto: NewsletterDto,
  ): Promise<ApiResponse> {
    try {
      const existing = await this.newsSubscriptionRepo.findOne({
        where: { emailAddress: requestDto.emailAddress },
      });
      if (existing) return Response.failure(Messages.AlreadySubscribed);

      const request = this.newsSubscriptionRepo.create({
        ...requestDto,
        status: StateStatus.ACTIVE,
      });

      const saved = await this.newsSubscriptionRepo.save(request);
      return Response.success(saved);
    } catch (ex) {
      console.log('Exception:', ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ======================================================
  // UPDATE NEWS
  // ======================================================

  async updateNews(
    newsId: number,
    authenticatedUser: User,
    requestDto: UpdateNewsDto,
  ): Promise<ApiResponse> {
    try {
      if (!this.isManagement(authenticatedUser))
        return Response.failure(Messages.NoPermission);

      const news = await this.newsRepo.findOne({ where: { id: newsId } });
      if (!news) return Response.failure(Messages.NewsNotAvailable);

      const updated = {
        ...news,
        ...requestDto,
      };

      this.appendHistory(updated, requestDto, authenticatedUser);

      await this.newsRepo.update({ id: newsId }, updated);

      const fresh = await this.newsRepo.findOne({ where: { id: newsId } });
      return Response.success(fresh);
    } catch (ex) {
      console.log('Exception:', ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ======================================================
  // DELETE
  // ======================================================

  async deleteNews(newsId: number, authUser: User): Promise<ApiResponse> {
    try {
      if (!this.isManagement(authUser))
        return Response.failure(Messages.NoPermission);

      await this.newsRepo.delete(newsId);
      return Response.success(Messages.DeletedSuccessfully);
    } catch (ex) {
      console.log('Exception:', ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ======================================================
  // GET BY ID
  // ======================================================

  async findNewsById(newsId: number): Promise<ApiResponse> {
    try {
      const news = await this.newsRepo.findOne({ where: { id: newsId } });
      if (!news) return Response.failure(Messages.NewsNotAvailable);
      return Response.success(news);
    } catch (ex) {
      console.log('Exception:', ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ======================================================
  // LIST (ADMIN & USER)
  // ======================================================

  async findAllNewss(
    authenticatedUser: User,
    page: number,
    limit: number,
  ): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const where: any = {};

      if (!this.isManagement(authenticatedUser)) {
        where.status = StateStatus.ACTIVE;
        where.audience = authenticatedUser.role; // role-based access
      }

      const [result, count] = await this.newsRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
      });

      if (!result.length) return Response.failure(Messages.NoNewsFound);

      const analytics = {
        articles: await this.newsRepo.count(),
        views: Helpers.randomViews(),
        subscribers: await this.newsSubscriptionRepo.count(),
      };

      const totalPages = Math.round(count / size) || 1;

      return Response.success({
        analytic: analytics,
        page: result,
        size,
        currentPage: skip,
        totalPages,
      });
    } catch (ex) {
      console.log('Exception:', ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ======================================================
  // PUBLIC LIST
  // ======================================================

  async findAllPublicNewss(page: number, limit: number): Promise<ApiResponse> {
    try {
      const size =
        limit > 0
          ? Number(limit)
          : Number(process.env.APP_PAGINATION_SIZE) || 15;
      const skip = page > 0 ? Number(page) : 0;

      const where = { status: StateStatus.ACTIVE, audience: 'PUBLIC' };

      const [result, count] = await this.newsRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
      });

      if (!result.length) return Response.failure(Messages.NoNewsFound);

      const totalPages = Math.round(count / size) || 1;

      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages,
      });
    } catch (ex) {
      console.log('Exception:', ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ======================================================
  // SEARCH
  // ======================================================

  async searchNewss(
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

      const where: any[] = [];

      if (!this.isManagement(authenticatedUser)) {
        where.push({
          status: StateStatus.ACTIVE,
          audience: authenticatedUser.role,
        });
      }

      if (searchString) {
        where.push({ title: Like(`%${searchString}%`) });
        where.push({ category: Like(`%${searchString}%`) });
        where.push({ description: Like(`%${searchString}%`) });
      }

      const [result, count] = await this.newsRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
      });

      if (!result.length) return Response.failure(Messages.NoNewsFound);

      const totalPages = Math.round(count / size) || 1;

      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages,
      });
    } catch (ex) {
      console.log('Exception:', ex);
      return Response.failure(Messages.Exception);
    }
  }

  // ======================================================
  // PUBLIC SEARCH
  // ======================================================

  async searchPublicNewss(
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

      const where: any[] = [];

      if (searchString) {
        where.push({
          title: Like(`%${searchString}%`),
          status: StateStatus.ACTIVE,
          audience: 'PUBLIC',
        });
        where.push({
          description: Like(`%${searchString}%`),
          status: StateStatus.ACTIVE,
          audience: 'PUBLIC',
        });
      }

      const [result, count] = await this.newsRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        take: size,
        skip: skip * size,
      });

      if (!result.length) return Response.failure(Messages.NoNewsFound);

      const totalPages = Math.round(count / size) || 1;

      return Response.success({
        page: result,
        size,
        currentPage: skip,
        totalPages,
      });
    } catch (ex) {
      console.log('Exception:', ex);
      return Response.failure(Messages.Exception);
    }
  }
}
