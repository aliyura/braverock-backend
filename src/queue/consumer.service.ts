import {
  BroadcastDistributionDto,
  BroadcastDto,
  InternalNotificationDto,
} from './../dtos/notification.dto';
import { Job } from 'bull';
import { Process, Processor } from '@nestjs/bull';
import { EmailDto, NotificationDto, SMSDto } from 'src/dtos/notification.dto';
import { MessagingService } from 'src/services/messaging/messaging.service';
import {
  Channel,
  NotificationPriority,
  StateStatus,
} from 'src/enums';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/schemas/user.schema';
import { In, Repository } from 'typeorm';
import { ProducerService } from './producer.service';
import { Analytic } from 'src/schemas/analytic.schema';
import { BroadcastLog } from 'src/schemas/broadcast/broadcast-log.schema';
import { Contact } from 'src/schemas/broadcast/contact.schema';
import { Broadcast } from 'src/schemas/broadcast/broadcast.schema';

@Processor(process.env.BULL_USER_ANALYTIC_QUEUE)
export class UserAnalyticMessagesConsumer {
  constructor(
    @InjectRepository(Analytic) private analyticRepo: Repository<Analytic>,
  ) {}
  @Process('user-analytic-job')
  async handleTranscode(job: Job) {
    console.log('User analytic consumer consumed request...');
    const user = job.data as User;
    //record users analytics
    var whitelistedKeys = process.env.USER_ANALYTICS as any;
    if (whitelistedKeys) whitelistedKeys = whitelistedKeys.split(',');
    else whitelistedKeys = [];

    for (var key in whitelistedKeys) {
      var analyticExist = await this.analyticRepo.findOne({
        where: {
          key: key,
          value: user[key],
        },
      });
      if (analyticExist) {
        analyticExist.count = analyticExist.count + 1;
        analyticExist.updatedAt = new Date();
      } else {
        analyticExist = {
          key: key,
          value: user[key],
          count: 1,
        } as Analytic;
      }
      await this.analyticRepo.save(analyticExist);
    }
    //end
    console.log('User analytic recorded!!');
  }
}

@Processor(process.env.BULL_EMAIL_QUEUE)
export class EmailMessagesConsumer {
  constructor(private readonly messagingService: MessagingService) {}
  @Process('email-job')
  async handleTranscode(job: Job) {
    console.log('Email consumer consumed request...');
    const email = job.data as EmailDto;
    await this.messagingService.sendEmail(email);
    console.log('completed!!');
  }
}

@Processor(process.env.BULL_SMS_QUEUE)
export class SMSMessagesConsumer {
  constructor(private readonly messagingService: MessagingService) {}
  @Process('sms-job')
  async handleTranscode(job: Job) {
    console.log('SMS consumer consumed request...');
    const sms = job.data as SMSDto;
    await this.messagingService.sendSMSDojah(sms);
  }
}

@Processor(process.env.BULL_NOTIFICATION_QUEUE)
export class NotificationMessagesConsumer {
  constructor(
    private readonly messagingService: MessagingService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  @Process('notification-job')
  async handleTranscode(job: Job) {
    console.log('Notification consumer consumed request...');
    if (job.data) {
      const notification = job.data as NotificationDto;
      await this.messagingService.sendNotification(notification);
    }
  }
}

@Processor(process.env.BULL_INTERNAL_NOTIFICATION_QUEUE)
export class InternalNotificationMessagesConsumer {
  constructor(private readonly messagingService: MessagingService) {}

  @Process('internal-notification-job')
  async handleTranscode(job: Job) {
    console.log('Internal notification consumer consumed request...');
    if (job.data) {
      const notification = job.data as InternalNotificationDto;
      await this.messagingService.sendInternalNotification(notification);
    }
  }
}

@Processor(process.env.BULL_BROADCAST_DISTRIBUTION_QUEUE)
export class BroadcastDistributionMessagesConsumer {
  constructor(
    @InjectRepository(Contact)
    private contactRepo: Repository<Contact>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Broadcast)
    private broadcastRepo: Repository<Broadcast>,
    @InjectRepository(BroadcastLog)
    private broadcastLogRepo: Repository<BroadcastLog>,
    private readonly queueProducerService: ProducerService,
  ) {}

  @Process('broadcast-distribution-job')
  async handleBroadcast(job: Job) {
    console.log('Broadcast distribution consumer consumed request...');
    const distribution = job.data as BroadcastDistributionDto;

    try {
      const recipients: any[] = [];

      // add  raw contacts
      if (distribution.contactIds?.length) {
        const contacts = await this.contactRepo.find({
          where: { id: In(distribution.contactIds) },
        });
        recipients.push(...contacts);
      }

      //add contact group ids
      if (distribution.groupIds?.length) {
        const contacts = await this.contactRepo.find({
          where: { groupId: In(distribution.groupIds) },
        });
        recipients.push(...contacts);
      }

      // add user with roles
      if (distribution.roles?.length) {
        const users = await this.userRepo.find({
          where: { role: In(distribution.roles) },
        });

        // Map users into "contact-like" objects
        const mappedUsers = users.map((u) => ({
          id: u.id,
          name: u.name,
          emailAddress: u.emailAddress,
          phoneNumber: u.phoneNumber,
          whatsappNumber: u.phoneNumber,
          isPlatformUser: true,
        }));
        recipients.push(...mappedUsers);
      }

      const broadcastDetail = await this.broadcastRepo.findOne({
        where: { id: distribution.broadcastId },
      });

      if (broadcastDetail && recipients.length > 0) {
        for (const contact of recipients) {
          // Save log
          const log: BroadcastLog = {
            broadcastId: broadcastDetail.id,
            contactId: contact.id,
            channel: broadcastDetail.channel,
            status: StateStatus.PENDING,
            message: broadcastDetail.message,
            subject: broadcastDetail.subject,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as unknown as BroadcastLog;

          await this.broadcastLogRepo.save(log);
        }
      }
    } catch (err) {
      console.error('Broadcast distribution failed', err);
    }
  }
}

@Processor(process.env.BULL_BROADCAST_RELEASE_QUEUE)
export class BroadcastReleaseMessagesConsumer {
  constructor(
    @InjectRepository(Contact)
    private contactRepo: Repository<Contact>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Broadcast)
    private broadcastRepo: Repository<Broadcast>,
    @InjectRepository(BroadcastLog)
    private broadcastLogRepo: Repository<BroadcastLog>,
    private readonly queueProducerService: ProducerService,
  ) {}

  @Process('broadcast-release-job')
  async handleBroadcast(job: Job) {
    console.log('Broadcast release consumer consumed request...');
    const request = job.data as { id: number };

    const broadcastDetail = await this.broadcastRepo.findOne({
      where: { id: request.id },
    });
    if (!broadcastDetail)
      console.error('Notification release failed: invalid broadcast id');

    const broadcastLogs = await this.broadcastLogRepo.find({
      where: {
        broadcastId: request.id,
      },
    });
    if (!broadcastLogs)
      console.error('Notification release failed: broadcast details not found');

    if (broadcastLogs.length > 0) {
      for (const broadcastLog of broadcastLogs) {
        const contact = await this.contactRepo.findOne({
          where: { id: broadcastLog.contactId },
        });

        if (contact) {
          const broadcast = {
            ...broadcastDetail,
            to: contact,
          } as unknown as BroadcastDto;

          let status: StateStatus = StateStatus.PENDING;
          try {
            await this.queueProducerService.publishBroadcast(broadcast);
            status = StateStatus.QUEUED;
          } catch (err) {
            console.error(
              'Notification publish failed for contact',
              contact.name,
              err,
            );
            status = StateStatus.FAILED;
          }
        } else {
          console.error('Notification release failed: Contact not found');
        }
      }
    }
  }
}

@Processor(process.env.BULL_BROADCAST_QUEUE)
export class BroadcastMessagesConsumer {
  constructor(
    private readonly messagingService: MessagingService,
    @InjectRepository(BroadcastLog)
    private broadcastLogRepo: Repository<BroadcastLog>,
  ) {}

  @Process('broadcast-job')
  async handleBroadcast(job: Job) {
    console.log('Broadcast consumer consumed request...');
    const broadcast = job.data as BroadcastDto;

    let status: StateStatus = StateStatus.PENDING;
    let providerResponse = '' as string;
    try {
      switch (broadcast.channel) {
        case Channel.SMS:
          const sms = {
            to: broadcast.to.phoneNumber,
            message: broadcast.message,
            priority: NotificationPriority.MEDIUM,
          } as SMSDto;

          const smsResponse = await this.messagingService.sendSMSDojah
          (sms);
          if (smsResponse.success) {
            status = StateStatus.SENT;
          } else {
            status = StateStatus.FAILED;
            providerResponse = smsResponse.payload;
          }
          break;

        case Channel.EMAIL:
          const email = {
            to: broadcast.to.emailAddress,
            toName: broadcast.to.name,
            subject: broadcast.subject,
            body: broadcast.message,
          } as EmailDto;

          const emailResponse = await this.messagingService.sendEmail(email);
          if (emailResponse.success) {
            status = StateStatus.SENT;
          } else {
            status = StateStatus.FAILED;
            providerResponse = emailResponse.payload;
          }
          break;

        case Channel.WHATSAPP:
          status = StateStatus.SENT;
          break;

        case Channel.INAPP:
          status = StateStatus.SENT;
          break;

        default:
          console.warn('Unknown broadcast channel:', broadcast.channel);
          status = StateStatus.FAILED;
      }
    } catch (err) {
      console.error(
        'Broadcast send failed for contact',
        broadcast.to.name,
        err,
      );
      status = StateStatus.FAILED;
    }

    // update broadcast log
    const log = await this.broadcastLogRepo.findOne({
      where: {
        broadcastId: broadcast.id,
        contactId: broadcast.to.id,
        channel: broadcast.channel,
      },
    });

    if (log) {
      log.providerResponse = providerResponse || '';
      log.status = status;
      log.updatedAt = new Date();
      await this.broadcastLogRepo.save(log);
    }
  }
}
