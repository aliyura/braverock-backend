
import { Injectable } from '@nestjs/common';
import * as NodeCache from 'node-cache';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationDetail } from 'src/schemas/notification-detail.schema';
import { NotificationDto } from 'src/dtos/notification.dto';
import { User } from 'src/schemas/user.schema';
import * as firebase from 'firebase-admin';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { Response } from 'src/helpers';
import { Messages } from 'src/utils/messages/messages';
import { getApps } from 'firebase-admin/app';
import { NotificationCategory, StateStatus } from 'src/enums';

@Injectable()
export class FirebaseService {
  cache = new NodeCache();
  blackListed = ['LOGIN', 'OTP', 'NOTIFICATION','CHAT'];
  constructor(
    @InjectRepository(NotificationDetail)
    private readonly notificationRepo: Repository<NotificationDetail>,
  ) { }


  async pushNotification(requestDto: NotificationDto): Promise<ApiResponse> {
    try {
      console.log('saving notification...', requestDto.subject);
      if (!this.blackListed.includes(requestDto.category) && requestDto.skipSave != true) {
        const request = {
          title: requestDto.subject,
          body: requestDto.body,
          status: StateStatus.UNSEEN,
          userId: requestDto.to.id,
          initiatedUserId: requestDto.from != 0 ? requestDto.from.id : null,
          category: requestDto.category,
        } as NotificationDetail;
        await this.notificationRepo.save(request);
      }

      console.log("Sending the notification to firebase.")
      if (requestDto.to.notificationToken && requestDto.to.notificationToken != "" && requestDto.to.notificationToken != null) {
        await firebase
          .messaging(getApps()[0])
          .send({
            notification: { title: requestDto.subject, body: requestDto.from != 0 ? requestDto.category==NotificationCategory.CHAT? `${requestDto.body}` : `${requestDto.from.name} ${requestDto.body}` : requestDto.body },
            token: requestDto.to.notificationToken,
            android: { priority: 'high' },
          })
          .catch((error: any) => {
            console.error('Notification error :::', error);
          });
      } else {
        console.error('Push notification skiped ::: token is not available');
      }

      console.log('notification pushed');
    } catch (error) {
      console.log('Notification error:', error);
      return error;
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
      return Response.failure(Messages.NoNotificationFound);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }
}
