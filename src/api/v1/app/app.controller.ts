import { Controller, Get, HttpStatus, Redirect } from '@nestjs/common';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { EmailDto, NotificationDto } from 'src/dtos/notification.dto';
import { NotificationCategory } from 'src/enums';
import { Response } from 'src/helpers';
import { ProducerService } from 'src/queue/producer.service';
import { User } from 'src/schemas/user.schema';
import { MessagingService } from 'src/services/messaging/messaging.service';

@Controller()
export class AppController {

  constructor(private readonly messagingService: MessagingService,
    private readonly queueProducerService: ProducerService) { }
  @Get('/docs')
  @Redirect('https://documenter.getpostman.com/view/10509620/2s9Yyv9eaw')
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  getDocs(): void { }

  @Get('/ping')
  async ping(): Promise<ApiResponse> {

    // start sending notification
    const notification = {
      from: 0,
      to: {
        name: "Rabiu Aliyu",
        emailAddress: "net.rabiualiyu@gmail.com",
        phoneNumber: "08064160204",
        notificationToken: "dL7JwZmMRZC5zJPP_fme88:APA91bGenShHnqVVXRVhw_jJSCbej7o-7qXt4X_Bacfh0Mxt0hUx1DTz98IaporshvAzT8CAJipgrtq93oG5LuwrE6ALWTkmS5lDjqcryLMKIOhECtoljdk"
      } as User,
      subject: "Server Health Check",
      body: "Realta server is performing well",
      enableInApp: true,
      category: NotificationCategory.NOTIFICATION,
      skipSave: true
    } as NotificationDto;

    this.queueProducerService.publishNotification(notification);


    const email = {
      to: "net.rabiualiyu@gmail.com",
      toName: "Rabiu Aliyu",
      subject: "Server Health Check",
      body: "Realta server is performing well",
      conext: {
        name: 'Rabiu Aliyu',
        message: "Realta server is performing well",
        subject: "Server Health Check",
      },
    } as EmailDto;
    await this.messagingService.sendEmail(email);

    return Response.send(
      HttpStatus.OK,
      'Realta server is up and running...',
    );
  }
}
