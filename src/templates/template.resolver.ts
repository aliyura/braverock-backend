import { NotificationCategory } from 'src/enums';
import * as path from 'path';
import * as fs from 'fs';

export class TemplateResolver {
  private static readonly TEMPLATE_FOLDER = path.join(
    __dirname,
    '../../templates',
  );

  /**
   * EMAIL TEMPLATE MAPPING
   */
  private static readonly categoryMap: Record<NotificationCategory, string> = {
    [NotificationCategory.NEWACCOUNT]: 'account-created.ejs',
    [NotificationCategory.CONTACT]: 'contact-message.ejs',
    [NotificationCategory.NOTIFICATION]: 'email.ejs',
    [NotificationCategory.STATUSCHANGE]: 'email.ejs',
    [NotificationCategory.LOGIN]: 'email.ejs',
    [NotificationCategory.CHAT]: 'email.ejs',
    [NotificationCategory.MESSAGE]: 'email.ejs',
    [NotificationCategory.OTP]: 'email.ejs',
    [NotificationCategory.STOCK]: 'email.ejs',
    [NotificationCategory.GENERAL]: 'email.ejs',

    [NotificationCategory.BROADCAST]: 'broadcast.ejs',
    [NotificationCategory.BIRTHDAY]: 'birthday-email-template.ejs',
    [NotificationCategory.HOLIDAY]: 'holiday-email-template.ejs',
    [NotificationCategory.ANNIVERSARY]: 'anniversary-email-template.ejs',

    // Payments
    [NotificationCategory.PAYMENT]: 'payment-success.ejs',
    [NotificationCategory.PAYMENT_RECEIVED]: 'payment-success.ejs',
    [NotificationCategory.PAYMENT_SUCCESSFUL]: 'payment-success.ejs',
    [NotificationCategory.PAYMENT_COMPLETED]: 'payment-success.ejs',
    [NotificationCategory.PAYMENT_REVERSED]: 'payment-success.ejs',
    [NotificationCategory.PAYMENT_REFUND]: 'payment-success.ejs',

    [NotificationCategory.PAYMENT_PLAN_CREATED]: 'payment-plan-created.ejs',

    // Investments
    [NotificationCategory.INVESTMENT_APPLIED]: 'investment-update.ejs',
    [NotificationCategory.INVESTMENT_APPROVED]: 'investment-update.ejs',
    [NotificationCategory.INVESTMENT_REJECTED]: 'investment-update.ejs',
    [NotificationCategory.INVESTMENT_PAYMENT_RECEIVED]: 'investment-update.ejs',
    [NotificationCategory.INVESTMENT_EXPIRING_SOON]: 'investment-update.ejs',
    [NotificationCategory.INVESTMENT_EXPIRED]: 'investment-update.ejs',
    [NotificationCategory.INVESTMENT_SETTLED]: 'investment-update.ejs',
    [NotificationCategory.INVESTMENT_EXTENDED]: 'investment-update.ejs',

    // Sales
    [NotificationCategory.SALE_CREATED]: 'sale-status.ejs',
    [NotificationCategory.SALE_APPLICATION]: 'sale-status.ejs',
    [NotificationCategory.SALE_APPROVED]: 'sale-status.ejs',
    [NotificationCategory.SALE_PAYMENT]: 'sale-status.ejs',
    [NotificationCategory.SALE_PAYMENT_COMPLETED]: 'sale-status.ejs',
    [NotificationCategory.SALE_PAYMENT_SUCCESSFUL]: 'sale-status.ejs',
    [NotificationCategory.SALE_COMPLETED]: 'sale-status.ejs',
    [NotificationCategory.SALE_APPLIED]: 'sale-status.ejs',

    // Query
    [NotificationCategory.QUERY_SENT]: 'query-issued.ejs',
    [NotificationCategory.QUERY_ACKNOWLEDGED]: 'query-acknowledged.ejs',
    [NotificationCategory.QUERY_REVOKED]: 'query-revoked.ejs',

    // Suspension
    [NotificationCategory.SUSPENDED]: 'suspension-issued.ejs',
    [NotificationCategory.SUSPENSION_REVOKED]: 'suspension-revoked.ejs',
    [NotificationCategory.SUSPENSION_COMPLETED]: 'suspension-completed.ejs',

    // Allocation
    [NotificationCategory.ALLOCATION]: 'allocation.ejs',

    // News
    [NotificationCategory.NEWS]: 'news-update.ejs',
  };

  /**
   * SMS FALLBACK MAPPING
   */
  private static readonly DefaultSmsTemplates: Record<
    NotificationCategory,
    string
  > = {
    [NotificationCategory.NEWACCOUNT]:
      'Your account has been created successfully. Welcome!',

    [NotificationCategory.CONTACT]:
      'You received a new contact message. Check your dashboard.',

    [NotificationCategory.NOTIFICATION]:
      'You have a new notification. Log in to view.',

    [NotificationCategory.STATUSCHANGE]:
      'Your request status has been updated. Check your dashboard.',

    [NotificationCategory.LOGIN]:
      'New login detected. If this wasn’t you, secure your account.',

    [NotificationCategory.CHAT]:
      'You received a new chat message. Open the app to view.',

    [NotificationCategory.MESSAGE]: 'You received a new message.',

    [NotificationCategory.OTP]: 'Your verification code is {{otp}}.',

    [NotificationCategory.STOCK]:
      'A stock update is available. Check your dashboard.',

    [NotificationCategory.GENERAL]:
      'You have a new update. Open the app to read more.',

    [NotificationCategory.BROADCAST]: 'A new announcement has been published.',

    [NotificationCategory.BIRTHDAY]:
      'Happy Birthday! Wishing you a great year ahead.',

    [NotificationCategory.HOLIDAY]:
      'Season’s greetings! Enjoy your celebration.',

    [NotificationCategory.ANNIVERSARY]: 'Happy Anniversary from all of us!',

    [NotificationCategory.PAYMENT]: 'Your payment was successful. Thank you.',

    [NotificationCategory.PAYMENT_RECEIVED]: 'Payment received. Thank you.',

    [NotificationCategory.PAYMENT_SUCCESSFUL]: 'Payment successful. Thank you.',

    [NotificationCategory.PAYMENT_COMPLETED]: 'Your payment is completed.',

    [NotificationCategory.PAYMENT_REVERSED]:
      'A payment was reversed. Check dashboard.',

    [NotificationCategory.PAYMENT_REFUND]: 'Your refund has been processed.',

    [NotificationCategory.PAYMENT_PLAN_CREATED]:
      'Your payment plan has been created.',

    [NotificationCategory.INVESTMENT_APPLIED]:
      'Your investment application was submitted.',

    [NotificationCategory.INVESTMENT_APPROVED]:
      'Your investment has been approved.',

    [NotificationCategory.INVESTMENT_REJECTED]:
      'Your investment request was declined.',

    [NotificationCategory.INVESTMENT_PAYMENT_RECEIVED]:
      'Investment payment received.',

    [NotificationCategory.INVESTMENT_EXPIRING_SOON]:
      'Your investment is expiring soon.',

    [NotificationCategory.INVESTMENT_EXPIRED]: 'Your investment has expired.',

    [NotificationCategory.INVESTMENT_SETTLED]:
      'Your investment has been settled.',

    [NotificationCategory.INVESTMENT_EXTENDED]:
      'Your investment has been extended.',

    [NotificationCategory.SALE_CREATED]: 'Your sale request has been created.',

    [NotificationCategory.SALE_APPLICATION]:
      'Your sale application has been submitted.',

    [NotificationCategory.SALE_APPROVED]: 'Your sale has been approved.',

    [NotificationCategory.SALE_PAYMENT]: 'Sale payment received.',

    [NotificationCategory.SALE_PAYMENT_COMPLETED]: 'Sale payment completed.',

    [NotificationCategory.SALE_PAYMENT_SUCCESSFUL]: 'Sale payment successful.',

    [NotificationCategory.SALE_COMPLETED]: 'Your sale process is completed.',

    [NotificationCategory.NEWS]: 'A news update is available.',

    [NotificationCategory.QUERY_SENT]: 'A query letter has been issued to you.',

    [NotificationCategory.QUERY_ACKNOWLEDGED]:
      'Your query letter has been acknowledged.',

    [NotificationCategory.QUERY_REVOKED]: 'Your query letter has been revoked.',

    [NotificationCategory.SUSPENDED]: 'You have been suspended. Check email.',

    [NotificationCategory.SUSPENSION_REVOKED]:
      'Your suspension has been revoked.',

    [NotificationCategory.SUSPENSION_COMPLETED]:
      'Your suspension period has ended.',

    [NotificationCategory.ALLOCATION]:
      'Your property allocation is successful.',
    [NotificationCategory.SALE_APPLIED]: 'New intrest from submitted',
  };

  /**
   * Resolves EJS email template path for category
   */
  public static getTemplate(category: NotificationCategory): string {
    const file = this.categoryMap[category] || './email.ejs';
    const fullPath = path.join(this.TEMPLATE_FOLDER, file);

    console.log(fullPath);

    return fs.existsSync(fullPath)
      ? fullPath
      : path.join(this.TEMPLATE_FOLDER, './email.ejs');
  }

  /**
   * Returns SMS text:
   * - If custom body exists → return it
   * - If not → return default template for the category
   * - If category missing → return a standard fallback
   */
  public static getSmsMessage(
    category: NotificationCategory,
    body?: string,
  ): string {
    if (body && body.trim().length > 0) return body;

    return (
      this.DefaultSmsTemplates[category] ||
      'You have a new update. Log in to view details.'
    );
  }
}
