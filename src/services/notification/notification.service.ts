import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Response } from 'src/helpers';
import { NotificationDetail } from 'src/schemas/notification-detail.schema';
import { User } from 'src/schemas/user.schema';
import { NotificationCategory, StateStatus } from 'src/enums/enums';
import { GenericNotificationDto, NotificationDto } from 'src/dtos/notification.dto';
import { ProducerService } from 'src/queue/producer.service';

@Injectable()
export class NotificationService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(NotificationDetail)
    private notificationRepo: Repository<NotificationDetail>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private readonly queueProducerService: ProducerService,
  ) { }


  async postNotification(authenticatedUser: User, requestDto: GenericNotificationDto): Promise<ApiResponse> {
    try {
      var totalPages = 1;
      var size = 2;
      var skip = 0;

      var [result, count] = await this.userRepo
        .createQueryBuilder()
        .where({
          status: Not(StateStatus.DELETED),
        })
        .skip(skip * size)
        .take(size)
        .orderBy('lastLoginAt', 'DESC')
        .getManyAndCount();

      if (result && result.length > 0) {
        totalPages = Math.round(count / size);
        skip = 0;

        for (var i = 0; i < result.length; i++) {
          const user = result[i] as User;

          // start sending notification
          const notification = {
            from: 0,
            to: authenticatedUser,
            subject: requestDto.subject,
            body: requestDto.body,
            enableEmail: true,
            enableInApp: true,
            category: NotificationCategory.NOTIFICATION,
          } as NotificationDto;

          this.queueProducerService.publishNotification(notification);

          //end
          if (i == result.length - 1 && totalPages > skip + 1) {
            skip = skip + 1;
            [result, count] = await this.userRepo
              .createQueryBuilder()
              .where({
                status: Not(StateStatus.DELETED),
              })
              .skip(skip * size)
              .take(size)
              .orderBy('lastLoginAt', 'DESC')
              .getManyAndCount();
          }
        }
      }
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }


  async updateNotificationStateStatus(authenticatedUser: User, notificationId: number, status: StateStatus): Promise<ApiResponse> {
    try {
      const notification = await this.notificationRepo.findOne({ where: { id: notificationId } });
      if (notification) {
        notification.status = status;
        notification.updatedAt = new Date();
        this.notificationRepo.save(notification);
        return Response.success('Updated successfully');
      } else {
        return Response.failure('Unable to update notification status');
      }

    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async deleteAllNotifications(authenticatedUser: User): Promise<ApiResponse> {
    try {
      await this.notificationRepo.delete({ userId: authenticatedUser.id });
      return Response.success('Deleted successfully');
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  async findAllNotifications(
    authenticatedUser: User,
    page: number,
    limit: number,
  ): Promise<ApiResponse> {
    try {
      const size = limit > 0 ? Number(limit) : Number(process.env.APP_PAGINATION_SIZE) || 15; const skip = page > 0 ? Number(page) : 0;

      const query = {
        userId: authenticatedUser.id,
      } as any;

      const [result, count] = await this.notificationRepo.findAndCount({
        where: query,
        relations: { user: true, initiatedUser: true },
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
      return Response.failure(Messages.NoUserFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
