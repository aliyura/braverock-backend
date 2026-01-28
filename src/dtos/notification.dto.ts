import { User } from 'src/schemas/user.schema';
import { Channel, UserRole } from 'src/enums';

export class GenericNotificationDto {
  to: string;
  subject: string;
  body: string;
}

export class BroadcastDistributionDto {
  broadcastId: number;
  roles: UserRole[];
  contactIds: number[];
  groupIds: number[];
  createdById: number;
}

export class BroadcastDto {
  id: number;
  to: {
    id: number;
    name: string;
    emailAddress?: string;
    phoneNumber?: string;
    whatsappNumber?: string;
    whatsappId?: string;
  };
  channel: Channel;
  subject?: string;
  message: string;
  attachments?: string[];
  contactIds?: number[];
  createdById: number;
  createdBy: User;
}

export class NotificationDto {
  from?: any;
  to: any;
  subject: string;
  body?: string;
  context?: any;
  category?: string;
  date?: string;
  audience?: string;
  enableSMS?: boolean;
  enableEmail?: boolean;
  enableInApp?: boolean;
  priority?: string;
  attachement?: string;
  skipSave?: boolean;
}
export class InternalNotificationDto {
  subject: string;
  body: string;
  emailAddress: string;
  phoneNumber: string;
  date: string;
  enableSMS: boolean;
  enableEmail: boolean;
  priority: string;
}

export class EmailDto {
  to: string;
  toName: string;
  subject: string;
  template?: string;
  body: string;
  conext: any;
}

export class SMSDto {
  to: string;
  message: string;
  priority: string;
}
