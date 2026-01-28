import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as moment from 'moment';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/schemas/user.schema';
import { ProducerService } from 'src/queue/producer.service';
import {
  NotificationCategory,
  NotificationPriority,
  StateStatus,
  UserRole,
} from 'src/enums';
import { NotificationDto } from 'src/dtos/notification.dto';
import { Employee } from 'src/schemas/hr/employee.schema';

@Injectable()
export class AutoMessagingScheduler {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    private readonly producer: ProducerService,
  ) {}

  private async broadcast<T extends { emailAddress?: string; name?: string }>(
    recipients: T[],
    subject: string,
    category: NotificationCategory,
    extra?: Partial<NotificationDto>,
  ) {
    for (const to of recipients) {
      const notification = {
        from: 0,
        to,
        subject,
        category,
        enableEmail: true,
        enableSMS: true,
        enableInApp: false,
        priority: NotificationPriority.MEDIUM,
        skipSave: false,
        ...extra,
      };
      await this.producer.publishNotification(notification as NotificationDto);
    }
  }

  // 🎂 Birthday greetings every day at 8:00 AM
  @Cron('0 8 * * *')
  async sendBirthdayMessages() {
    const today = moment().format('MM-DD');

    // Users with birthday today
    const birthdayUsers = await this.userRepo
      .createQueryBuilder('u')
      .where('DATE_FORMAT(u.dob, "%m-%d") = :today', { today })
      .andWhere('u.status = :status', { status: StateStatus.ACTIVE })
      .getMany();

    // Employees with birthday today
    const birthdayEmployees = await this.employeeRepo
      .createQueryBuilder('e')
      .where('DATE_FORMAT(e.dob, "%m-%d") = :today', { today })
      .andWhere('e.status = :status', { status: StateStatus.ACTIVE })
      .getMany();

    await this.broadcast(
      birthdayUsers,
      '🎉 Happy Birthday!',
      NotificationCategory.BIRTHDAY,
    );
    await this.broadcast(
      birthdayEmployees,
      '🎉 Happy Birthday!',
      NotificationCategory.BIRTHDAY,
    );

    console.log(
      `✅ Birthday messages sent to ${birthdayUsers.length} users and ${birthdayEmployees.length} employees`,
    );
  }

  // 🎊 Nigerian public & cultural holidays (9:00 AM daily, only fires if today is in the map)
  @Cron('0 9 * * *')
  async sendHolidayMessages() {
    const holiday = this.getTodayHoliday();
    if (!holiday) return;

    const users = await this.userRepo.find({
      where: { status: StateStatus.ACTIVE },
    });
    const employees = await this.employeeRepo.find({
      where: { status: StateStatus.ACTIVE },
    });

    await this.broadcast(
      users,
      `🎊 Happy ${holiday}!`,
      NotificationCategory.HOLIDAY,
      { attachement: holiday },
    );
    await this.broadcast(
      employees,
      `🎊 Happy ${holiday}!`,
      NotificationCategory.HOLIDAY,
      { attachement: holiday },
    );

    console.log(
      `✅ Holiday message broadcasted for ${holiday} to ${users.length} users and ${employees.length} employees`,
    );
  }

  @Cron('0 10 * * *')
  async sendAnniversaryMessages() {
    const today = moment().format('MM-DD');

    // Clients by account creation date
    const anniversaryClients = await this.userRepo
      .createQueryBuilder('u')
      .where('DATE_FORMAT(u.createdAt, "%m-%d") = :today', { today })
      .andWhere('u.status = :status', { status: StateStatus.ACTIVE })
      .andWhere('u.role = :role', { role: UserRole.CLIENT })
      .getMany();

    // Employees by hire date
    const anniversaryEmployees = await this.employeeRepo
      .createQueryBuilder('e')
      .where('DATE_FORMAT(e.hireDate, "%m-%d") = :today', { today })
      .andWhere('e.status = :status', { status: StateStatus.ACTIVE })
      .getMany();

    await this.broadcast(
      anniversaryClients,
      `🏠 Happy ${process.env.APP_NAME || 'Realta'} Anniversary!`,
      NotificationCategory.ANNIVERSARY,
    );

    await this.broadcast(
      anniversaryEmployees,
      '🎉 Happy Work Anniversary!',
      NotificationCategory.ANNIVERSARY,
    );

    console.log(
      `✅ Anniversary messages → Clients: ${anniversaryClients.length}, Employees: ${anniversaryEmployees.length}`,
    );
  }

  private getTodayHoliday(): string | null {
    const today = moment().format('MM-DD');
    const holidays: Record<string, string> = {
      '01-01': 'New Year’s Day',
      '05-01': 'Workers’ Day',
      '06-12': 'Democracy Day',
      '10-01': 'Independence Day',
      '12-25': 'Christmas Day',
      '12-26': 'Boxing Day',
      '03-19': 'Mother’s Day',
      '06-16': 'Father’s Day',
      '04-10': 'Eid al-Fitr (approx.)',
      '04-11': 'Eid al-Fitr (Day 2, approx.)',
      '06-17': 'Eid al-Adha (approx.)',
      '06-18': 'Eid al-Adha (Day 2, approx.)',
      '02-14': 'Valentine’s Day',
      '03-08': 'International Women’s Day',
      '09-01': 'New Month Celebration',
      '12-31': 'Year-End Reflections',
    };

    return holidays[today] || null;
  }
}
