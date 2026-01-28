import { InternalNotificationDto } from './../../dtos/notification.dto';
import { Injectable, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { Messages } from 'src/utils/messages/messages';
import { Helpers, Response } from 'src/helpers';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailDto, NotificationDto, SMSDto } from 'src/dtos/notification.dto';
import { ApiResponse } from 'src/dtos/ApiResponse.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { NotificationCategory, NotificationPriority } from 'src/enums';
import * as ejs from 'ejs';
import * as path from 'path';
import { User } from 'src/schemas/user.schema';
import { TemplateResolver } from 'src/templates/template.resolver';

@Injectable()
export class MessagingService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly firebaseService: FirebaseService,
  ) {}

  private getDojahHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `${process.env.DOJAH_SECRET_KEY}`,
      Appid: `${process.env.DOJAH_APP_ID}`,
    };
  }

  async sendWhatsappMessageDojah(sms: SMSDto): Promise<ApiResponse> {
    const url = `${process.env.DOJAH_BASE_URL}/api/v1/messaging/sms`;
    const payload = {
      destination: sms.to,
      message: sms.message,
      channel: 'whatsapp',
      sender_id: 'ValarPay',
    };
    const response = await axios.post(url, payload, {
      headers: this.getDojahHeaders(),
    });

    if (response.status !== 200) {
      console.error(response?.data);
      return Response.failure(response.data);
    }
    return Response.success(response.data);
  }

  async sendSMSDojah(sms: SMSDto): Promise<ApiResponse> {
    const url = `${process.env.DOJAH_BASE_URL}/api/v1/messaging/sms`;

    const payload = {
      destination: sms.to,
      message: sms.message,
      channel: 'sms',
      sender_id: 'ValarPay',
    };
    const response = await axios.post(url, payload, {
      headers: this.getDojahHeaders(),
    });

    if (response.status !== 200) {
      console.error(response?.data);
      return Response.failure(response.data);
    }
    return Response.success(response.data);
  }

  async sendSMSBulkNigeria(sms: SMSDto): Promise<ApiResponse> {
    try {
      const apiKey = process.env.SMS_APIKEY;
      const baseURL = process.env.SMS_BASEURL;
      const appName = process.env.APP_NAME;

      const req = `${baseURL}?api_token=${apiKey}&from=${appName}&to=${sms.to}&body=${sms.message}&dnd=2`;
      console.log('SMS request:', req);
      const response = await axios.get(req);
      if (response.status == HttpStatus.OK)
        return Response.success(response.data);

      return Response.failure('Unable to send SMS');
    } catch (ex) {
      console.log(Messages.UnableToSendSMS);
      return Response.failure(Messages.Exception);
    }
  }

  async sendEmail(requestDto: EmailDto): Promise<ApiResponse> {
    try {
      console.log('Sending email:', requestDto.body);
      const context = {
        ...requestDto.conext,
        businessName: process.env.APP_NAME || 'Realta',
        logo:
          process.env.APP_LOGO ||
          'https://braverock360.com/assets/images/realtor-logo2.png',
      };
      const response = await this.mailerService.sendMail({
        to: requestDto.to,
        subject: requestDto.subject,
        template: requestDto.template ?? './email.ejs',
        context: context,
      });
      if (response) return Response.success(Messages.EmailSentSuccessful);
      return Response.failure(Messages.UnableToSendEmail);
    } catch (ex) {
      console.log(ex);
      return Response.failure(Messages.UnableToSendEmail);
    }
  }

  async sendHolidayEmail(email: EmailDto, holiday: string) {
    const templatePath = path.join(
      __dirname,
      '../../templates/holiday-email-template.ejs',
    );
    const html = await ejs.renderFile(templatePath, {
      logoUrl:
        process.env.APP_LOGO_URL || 'https://braverock365.com/assets/logo.png',
      subject: `🎉 Happy ${holiday}!`,
      headline: `Happy ${holiday}!`,
      subheadline: 'Celebrate the day with joy and unity.',
      userName: email.conext.name,
      bodyMessage: `Wishing you a joyful ${holiday} celebration from all of us at ${process.env.APP_NAME || 'Realta'}!`,
      heroGradient: this.getHolidayTheme(holiday),
      ctaUrl: 'https://braverock365.com',
      ctaText: 'Visit Us',
      companyName: process.env.APP_NAME || 'Realta',
    });
    await this.mailerService.sendMail({
      to: email.to,
      subject: `Happy ${holiday}!`,
      html,
    });
  }

  async sendBirthdayEmail(email: EmailDto) {
    const templatePath = path.join(
      __dirname,
      '../../templates/birthday-email-template.ejs',
    );
    const html = await ejs.renderFile(templatePath, {
      logoUrl:
        process.env.APP_LOGO_URL || 'https://braverock365.com/assets/logo.png',
      userName: email.conext.name,
      companyName: process.env.APP_NAME || 'Realta',
      ctaUrl: process.env.APP_URL || 'https://braverock365.com',
      appUrl: process.env.APP_URL || 'https://braverock365.com',
    });
    await this.mailerService.sendMail({
      to: email.to,
      subject: `🎉 Happy Birthday, ${email.conext.name}!`,
      html,
    });
  }

  async sendAnniversaryEmail(email: EmailDto) {
    const templatePath = path.join(
      __dirname,
      '../../templates/anniversary-email-template.ejs',
    );
    const html = await ejs.renderFile(templatePath, {
      logoUrl:
        process.env.APP_LOGO_URL || 'https://braverock365.com/assets/logo.png',
      userName: email.conext?.name,
      companyName: process.env.APP_NAME || 'Realta',
      ctaUrl: process.env.APP_URL || 'https://braverock365.com',
      appUrl: process.env.APP_URL || 'https://braverock365.com',
    });

    await this.mailerService.sendMail({
      to: email.to,
      subject: `🎊 Happy Anniversary, ${email.conext.name}!`,
      html,
    });
  }

  private getHolidayTheme(holiday: string) {
    const themes = {
      'Christmas Day': 'linear-gradient(135deg, #ff3c3c, #ff9f00)',
      'Eid al-Fitr': 'linear-gradient(135deg, #16a085, #2ecc71)',
      'Eid al-Adha': 'linear-gradient(135deg, #1abc9c, #27ae60)',
      'Independence Day': 'linear-gradient(135deg, #00923f, #fff200)',
      'Valentine’s Day': 'linear-gradient(135deg, #ff5e7e, #ff006e)',
      'New Year’s Day': 'linear-gradient(135deg, #007bff, #00b894)',
      'Father’s Day': 'linear-gradient(135deg, #34495e, #2c3e50)',
      'Mother’s Day': 'linear-gradient(135deg, #e84393, #ff7675)',
      'Democracy Day': 'linear-gradient(135deg, #006400, #00a86b)',
      default: 'linear-gradient(135deg, #007bff, #00b894)',
    };
    return themes[holiday] || themes.default;
  }

  async sendInternalNotification(
    requestDto: InternalNotificationDto,
  ): Promise<ApiResponse> {
    const supportEmails =
      process.env.SUPPORT_EMAILS || 'net.rabiualiyu@gmail.com';
    const supportNumbers = process.env.SUPPORT_PHONENUMBERS || '+2348064160204';

    if (requestDto.enableEmail) {
      const emailRequest = new EmailDto();
      emailRequest.body = requestDto.body;
      emailRequest.subject = requestDto.subject;
      emailRequest.to = supportEmails;
      emailRequest.conext = {
        name: ' Support Team',
        message: requestDto.body,
        subject: requestDto.subject,
      };
      await this.sendEmail(emailRequest);
    }

    if (requestDto.enableSMS) {
      const sms = {
        to: supportNumbers,
        message: requestDto.body,
        priority: requestDto.priority,
      } as SMSDto;

      await this.sendSMSDojah(sms);
    }

    return Response.success(Messages.NotificationSentSuccessfully);
  }

  async sendNotification(requestDto: NotificationDto): Promise<ApiResponse> {
    const user = requestDto.to;
    //display priority notification
    if (requestDto.category == NotificationCategory.OTP)
      console.log(requestDto.subject, requestDto.body);

    if (requestDto.enableInApp) {
      console.log('Sending inapp notification...');
      await this.firebaseService.pushNotification(requestDto);
    }

    if (requestDto.enableEmail) {
      //send Email
      console.log('Sending email notification...');

      const activeTemplate = TemplateResolver.getTemplate(
        requestDto.category as NotificationCategory,
      );
      if (user.emailAddress && user.emailAddress != null) {
        const emailRequest = new EmailDto();
        emailRequest.subject = requestDto.subject;
        emailRequest.to = user.emailAddress;
        emailRequest.template = activeTemplate;
        emailRequest.conext = {
          name: user.name,
          subject: requestDto.subject,
        };

        if (requestDto.category == NotificationCategory.ANNIVERSARY) {
          await this.sendAnniversaryEmail(emailRequest);
        } else if (requestDto.category == NotificationCategory.HOLIDAY) {
          await this.sendHolidayEmail(emailRequest, requestDto.attachement);
        } else if (requestDto.category == NotificationCategory.BIRTHDAY) {
          await this.sendBirthdayEmail(emailRequest);
        } else {
          emailRequest.body = requestDto.body;
          emailRequest.subject = requestDto.subject;
          emailRequest.to = user.emailAddress;
          emailRequest.template = activeTemplate;
          emailRequest.conext = {
            name: user.name,
            message: requestDto.body,
            subject: requestDto.subject,
            ...requestDto.context,
          };

          await this.sendEmail(emailRequest);
        }
      }
    }

    if (requestDto.enableSMS) {
      //send SMS
      console.log('Sending sms notification...');
      if (user.phoneNumber && user.phoneNumber != null) {
        var phoneNumber = user.phoneNumber;
        if (!user.countryCode) user.countryCode = '+234';

        if (user.phoneNumber.startsWith('0'))
          phoneNumber = `${user.countryCode.trim()}${user.phoneNumber.substring(1)}`;

        const smsBody =
          requestDto.body && requestDto.body.trim().length > 0
            ? requestDto.body
            : TemplateResolver.getSmsMessage(
                requestDto.category as NotificationCategory,
                requestDto.body,
              );

        const sms = {
          to: phoneNumber,
          message: smsBody,
          priority: requestDto.priority,
        } as SMSDto;

        if (sms.priority == NotificationPriority.HIGH) {
          await this.sendSMSDojah(sms);
          // await this.sendQuickSMS(sms);
        } else {
          await this.sendSMSDojah(sms);
        }
      }
    }
    return Response.success(Messages.NotificationSentSuccessfully);
  }
}
