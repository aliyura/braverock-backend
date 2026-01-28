import {
  BroadcastDistributionDto,
  BroadcastDto,
  InternalNotificationDto,
} from './../dtos/notification.dto';
import { EmailDto, NotificationDto, SMSDto } from 'src/dtos/notification.dto';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { User } from 'src/schemas/user.schema';

@Injectable()
export class ProducerService {
  constructor(
    @InjectQueue(process.env.BULL_SMS_QUEUE)
    private readonly smsQueue: Queue,
    @InjectQueue(process.env.BULL_EMAIL_QUEUE)
    private readonly emailQueue: Queue,
    @InjectQueue(process.env.BULL_NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
    @InjectQueue(process.env.BULL_INTERNAL_NOTIFICATION_QUEUE)
    private readonly internalNotificationQueue: Queue,
    @InjectQueue(process.env.BULL_USER_ANALYTIC_QUEUE)
    private readonly userAnalyticQueue: Queue,
    @InjectQueue(process.env.BULL_BROADCAST_DISTRIBUTION_QUEUE)
    private readonly broadcastDistributionQueue: Queue,
    @InjectQueue(process.env.BULL_BROADCAST_RELEASE_QUEUE)
    private readonly broadcastReleaseQueue: Queue,
    @InjectQueue(process.env.BULL_BROADCAST_QUEUE)
    private readonly broadcastQueue: Queue,
  ) {}
  async publishSMS(request: SMSDto) {
    console.log('sending sms....');
    await this.smsQueue.add('sms-job', request);
  }
  async publishEmail(request: EmailDto) {
    console.log('sending email....');
    await this.emailQueue.add('email-job', request);
  }
  async publishNotification(request: NotificationDto) {
    console.log('pushing notification....', request.subject);
    await this.notificationQueue.add('notification-job', request);
  }
  async publishInternalNotification(request: InternalNotificationDto) {
    console.log('pushing admin notification....', request.subject);
    await this.internalNotificationQueue.add(
      'internal-notification-job',
      request,
    );
  }
  async publishAnalytic(user: User) {
    console.log('pushing new analytic....');
    await this.userAnalyticQueue.add('user-analytic-job', user);
  }

  //create broadcast
  async publishBroadcastDistribution(request: BroadcastDistributionDto) {
    console.log('pushing broadcast distribution notification....');
    await this.broadcastDistributionQueue.add(
      'broadcast-distribution-job',
      request,
    );
  }
  //release broadcast
  async publishBroadcastRelease(request: { id: number }) {
    console.log('pushing broadcast release notification....');
    await this.broadcastReleaseQueue.add('broadcast-release-job', request);
  }
  //send broadcast messages
  async publishBroadcast(request: BroadcastDto) {
    console.log('pushing broadcast notification....', request.subject);
    await this.broadcastQueue.add('broadcast-job', request);
  }
}
