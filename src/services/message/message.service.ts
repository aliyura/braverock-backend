import { InternalNotificationDto, NotificationDto } from './../../dtos/notification.dto';
import { Message } from '../../schemas/company/message.schema';
import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import { NotificationCategory, NotificationPriority, StateStatus, UserRole } from 'src/enums';
import { MessageDto, ReplyMessageDto } from 'src/dtos/company/message.dto';
import { ProducerService } from 'src/queue/producer.service';
import { NewsSubscription } from 'src/schemas/company/news-subscription.schema';
import { UpdateStatusDto } from 'src/dtos/master';

@Injectable()
export class MessageService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(NewsSubscription) private newsSubscriptionRepo: Repository<NewsSubscription>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly queueProducerService: ProducerService,
  ) { }

  async addMessage(requestDto: MessageDto): Promise<ApiResponse> {
    try {

      const request = {
        ...requestDto,
        status: StateStatus.PENDING,
      } as any;

      const created = await this.messageRepo.save(request);
      if (created) {

        const newLetter = {
          emailAddress: requestDto.emailAddress,
          status: StateStatus.ACTIVE,
        }
        await this.newsSubscriptionRepo.save(newLetter);

        //send notification to internal support team
        const notification = {
          subject: `New Message ${requestDto.name ? 'From' + requestDto.name : ''}`,
          body: `${requestDto.message}`,
          emailAddress: requestDto.emailAddress,
          phoneNumber: requestDto.phoneNumber,
          date: new Date(),
          enableEmail: true,
          enableSMS: true,
          priority: NotificationPriority.LOW,
        } as unknown as InternalNotificationDto;
        this.queueProducerService.publishInternalNotification(notification);


        return Response.success(created);
      } else {
        return Response.failure('Unable to send message');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async updateMessageStatus(
    authenticatedUser: User,
    requestId: number,
    requestDto: UpdateStatusDto,
  ): Promise<ApiResponse> {
    try {

      if (authenticatedUser.role != UserRole.ADMIN && authenticatedUser.role != UserRole.SUPERADMIN && authenticatedUser.role != UserRole.MANAGER)
        return Response.failure(Messages.NoPermission)

      const message = await this.messageRepo.findOne({
        where: { id: requestId },
      });
      if (!message) return Response.failure(Messages.MessageNotFound);

      const request = {
        ...message,
        status: requestDto.status.toUpperCase(),
        updatedAt: new Date(),
      } as any;

      const created = await this.messageRepo.save(request);
      if (created) {
        return Response.success(created);
      } else {
        return Response.failure('Unable to update message');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }


  async replyMessage(
    authenticatedUser: User,
    messageId: number,
    requestDto: ReplyMessageDto,
  ): Promise<ApiResponse> {
    try {

      if (authenticatedUser.role != UserRole.ADMIN
        && authenticatedUser.role != UserRole.SUPERADMIN
        && authenticatedUser.role != UserRole.MANAGER
        && authenticatedUser.role != UserRole.CUSTOMERCARE)
        return Response.failure(Messages.NoPermission)

      const message = await this.messageRepo.findOne({
        where: { id: messageId },
      });
      if (!message) return Response.failure(Messages.MessageNotFound);

      const reply={
        ...requestDto,
        createdAt: new Date()
      }

      message.status = StateStatus.REPLIED;
      if (message.replies == null)
        message.replies = [reply];
      else message.replies = [reply, ...message.replies];

      const notification = {
        from: 0,
        to: {
          name: message.name,
          emailAddress: message.emailAddress,
          phoneNumber: message.phoneNumber,

        },
        subject: requestDto.subject,
        body: requestDto.message,
        category: NotificationCategory.MESSAGE,
        enableEmail: true,
        enableSMS: true,
        enableInApp: true,
        priority: NotificationPriority.HIGH,
      } as unknown as NotificationDto;

      this.queueProducerService.publishNotification(notification);

      const updated = await this.messageRepo.update({ id: message.id }, message);
      if (updated) {
        return Response.success(message);
      } else {
        return Response.failure('Unable to reply message');
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllMessages(
    authenticatedUser: User,
    page: number,
    limit: number,
  ): Promise<ApiResponse> {
    try {
      const size = limit > 0 ? Number(limit) : Number(process.env.APP_PAGINATION_SIZE) || 15; const skip = page > 0 ? Number(page) : 0;

      const query = {} as any;

      const [result, count] = await this.messageRepo.findAndCount({
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
      return Response.failure(Messages.NoMessageFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async searchMessages(
    authenticatedUser: User,
    page: number,
    limit: number,
    searchString: string,
  ): Promise<ApiResponse> {
    try {
      const size = limit > 0 ? Number(limit) : Number(process.env.APP_PAGINATION_SIZE) || 15; const skip = page > 0 ? Number(page) : 0;

      const query = [] as any;


      query.push({
        name: Like(`%${searchString}%`),
      });

      const [result, count] = await this.messageRepo.findAndCount({
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
      return Response.failure(Messages.NoMessageFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
