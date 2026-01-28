import { Module } from '@nestjs/common';
import { User } from './schemas/user.schema';
import { UserService } from './services/user/user.service';
import { AuthService } from './services/auth/auth.service';
import { UserController } from './api/v1/user/user.controller';
import { AuthController } from './api/v1/auth/auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthStrategy } from './services/auth/auth.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoService } from './services/crypto/crypto.service';
import { FileController } from './api/v1/file/file.controller';
import { FileService } from './services/file/file.service';
import { AppController } from './api/v1/app/app.controller';
import { MessagingService } from './services/messaging/messaging.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { join } from 'path';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';
import { ChatGateway } from './socket/websocket.gateway.service';
import { ChatService } from './services/chat/chat.service';
import { ChatController } from './api/v1/chat/chat.controller';
import { ChatMessage } from './schemas/chat-message.schema';
import { BullModule } from '@nestjs/bull';
import {
  EmailMessagesConsumer,
  NotificationMessagesConsumer,
  SMSMessagesConsumer,
} from './queue/consumer.service';
import { ProducerService } from './queue/producer.service';
import { AnalyticController } from './api/v1/analytic/analytic.controller';
import { AnalyticService } from './services/analytic/analytic.service';
import { NotificationDetail } from './schemas/notification-detail.schema';
import { FirebaseService } from './services/firebase/firebase.service';
import { Message } from './schemas/company/message.schema';
import { MessageController } from './api/v1/message/message.controller';
import { MessageService } from './services/message/message.service';
import { NotificationController } from './api/v1/notification/notification.controller';
import { NotificationService } from './services/notification/notification.service';
import { WebhookController } from './api/v1/webhook/webhook.controller';
import { WebhookService } from './services/webhook/webhook.service';
import { Webhook } from './schemas/webhook.schema';
import { Analytic } from './schemas/analytic.schema';
import { Announcement } from './schemas/announcement.schema';
import { AnnouncementController } from './api/v1/announcement/announcement.controller';
import { AnnouncementService } from './services/announcement/announcement.service';
import { News } from './schemas/company/news.schema';
import { NewsSubscription } from './schemas/company/news-subscription.schema';
import { Faq } from './schemas/company/faq.schema';
import { NewsController } from './api/v1/news/news.controller';
import { FaqController } from './api/v1/faq/faq.controller';
import { NewsService } from './services/news/news.service';
import { FaqService } from './services/faq/faq.service';
import { Debt } from './schemas/accounting/debt.schema';
import { Expense } from './schemas/accounting/expense.schema';
import { DebtController } from './api/v1/debt/debt.controller';
import { ExpenseController } from './api/v1/expense/expense.controller';
import { DebtService } from './services/debt/debt.service';
import { ExpenseService } from './services/expense/expense.service';
import { DebtPayment } from './schemas/accounting/debt-payment.schema';
import { DebtPaymentService } from './services/debt/debt-payment.service';
import { DebtPaymentController } from './api/v1/debt/debt-payment.controller';
import { Sale } from './schemas/sale/sale.schema';
import { SaleController } from './api/v1/sale/sale.controller';
import { SaleService } from './services/sale/sale.service';
import { Payment } from './schemas/sale/payment.schema';
import { Estate } from './schemas/property/estate.schema';
import { MaterialType } from './schemas/inventory/material-type.schema';
import { Material } from './schemas/inventory/material.schema';
import { EstateController } from './api/v1/estate/estate.controller';
import { MaterialTypeController } from './api/v1/material/material-type.controller';
import { MaterialController } from './api/v1/material/material.controller';
import { EstateService } from './services/estate/estate.service';
import { MaterialTypeService } from './services/material/materialType.service';
import { MaterialService } from './services/material/material.service';
import { MaterialRequest } from './schemas/inventory/material-request.schema';
import { MaterialRequestController } from './api/v1/material/material-request.controller';
import { MaterialRequestService } from './services/material/material-request.service';
import { Allocation } from './schemas/sale/allocation.schema';
import { AllocationController } from './api/v1/sale-allocation/sale-allocation.controller';
import { PaymentController } from './api/v1/payment/payment.controller';
import { PaymentService } from './services/payment/payment.service';
import { AllocationService } from './services/sale-allocation/sale-allocation.service';
import { HouseController } from './api/v1/house/house.controller';
import { HouseService } from './services/house/house.service';
import { Bill } from './schemas/bill.schema';
import { Schedule } from './schemas/schedule.schema';
import { BillController } from './api/v1/bill/bill.controller';
import { ScheduleController } from './api/v1/schedule/schedule.controller';
import { BillService } from './services/bill/bill.service';
import { ScheduleService } from './services/schedule/schedule.service';
import { File } from './schemas/file.schema';
import { Complaint } from './schemas/complaint.schema';
import { ComplaintController } from './api/v1/complaint/complaint.controller';
import { InspectionRequestController } from './api/v1/inspection-request/inspection-request.controller';
import { ComplaintService } from './services/complaint/complaint.service';
import { InspectionRequestService } from './services/inspection-request/inspection-request.service';
import { LayoutController } from './api/v1/layout/layout.controller';
import { PlotController } from './api/v1/plot/plot.controller';
import { LayoutService } from './services/layout/layout.service';
import { PlotService } from './services/plot/plot.service';
import { ConfigurationController } from './api/v1/configuration/configuration.controller';
import { ConfigurationService } from './services/configuration/configuration.service';
import { Configuration } from './schemas/configuration.schema';
import { Reservation } from './schemas/sale/reservation.schema';
import { ReservationController } from './api/v1/reservation/reservation.controller';
import { ReservationService } from './services/reservation/reservation.service';
import { MaterialSupplyRequest } from './schemas/inventory/material-supply-request.schema';
import { MaterialSupplyRequestController } from './api/v1/material/material-supply-request.controller';
import { MaterialSupplyRequestService } from './services/material/material-supply-request.service';
import { MaterialSupplyHistory } from './schemas/inventory/material-supply-history.schema';
import { Payable } from './schemas/payable.schema';
import { Incident } from './schemas/incident.schema';
import { FundRequest } from './schemas/accounting/fund-request.schema';
import { AccountTransaction } from './schemas/accounting/account-transaction.schema';
import { IncidentController } from './api/v1/incident/incident.controller';
import { FundRequestController } from './api/v1/fund-request/fund-request.controller';
import { IncidentService } from './services/incident/incident.service';
import { AccountService } from './services/account/account.service';
import { FundRequestService } from './services/fund-request/fund-request.service';
import { AccountController } from './api/v1/account/account.controller';
import { Account } from './schemas/accounting/account.schema';
import { ContactController } from './api/v1/broadcast/contact.controller';
import { BroadcastController } from './api/v1/broadcast/broadcast.controller';
import { ContactService } from './services/broadcast/contact.service';
import { BroadcastService } from './services/broadcast/broadcast.service';
import { BroadcastLogService } from './services/broadcast/broadcast-log.service';
import { Contact } from './schemas/broadcast/contact.schema';
import { ContactGroup } from './schemas/broadcast/contact-group.schema';
import { Broadcast } from './schemas/broadcast/broadcast.schema';
import { BroadcastLog } from './schemas/broadcast/broadcast-log.schema';
import { ContactGroupService } from './services/broadcast/contact-group.service';
import { BroadcastLogController } from './api/v1/broadcast/broadcast-log.controller';
import { ContactGroupController } from './api/v1/broadcast/contact-group.controller';
import { ChatThread } from './schemas/chat-thread.schema';
import { ChatParticipant } from './schemas/chat-participant.schema';
import { AutoMessagingScheduler } from './schedulers/auto-messaging.scheduler';
import { Employee } from './schemas/hr/employee.schema';
import { Payroll } from './schemas/hr/payroll.schema';
import { Leave } from './schemas/hr/leave.schema';
import { Attendance } from './schemas/hr/attendance.schema';
import { EmployeeController } from './api/v1/hr/employee.controller';
import { PayrollController } from './api/v1/hr/payroll.controller';
import { AttendanceController } from './api/v1/hr/attendance.controller';
import { LeaveController } from './api/v1/hr/leave.controller';
import { EmployeeService } from './services/hr/employee.service';
import { AttendanceService } from './services/hr/attendance.service';
import { PayrollService } from './services/hr/payroll.service';
import { LeaveService } from './services/hr/leave.service';
import { Investment } from './schemas/investment/investment.schema';
import { InvestmentClosure } from './schemas/investment/investment-closure.schema';
import { InvestmentSettlement } from './schemas/investment/investment-settlement.schema';
import { InvestmentController } from './api/v1/investment/investment.controller';
import { InvestmentClosureController } from './api/v1/investment/investment-closure.controller';
import { InvestmentSettlementController } from './api/v1/investment/investment-settlement.controller';
import { InvestmentService } from './services/investment/investment.service';
import { InvestmentSettlementService } from './services/investment/investment-settlement.service';
import { InvestmentClosureService } from './services/investment/investment-closure.service';
import { PaymentPlanService } from './services/payment/payment-plan.service';
import { PaymentPlanController } from './api/v1/payment/payment-plan.controller';
import { PaymentPlan } from './schemas/sale/payment-plan.schema';
import { QueryLetter } from './schemas/hr/query-letter.schema';
import { Suspension } from './schemas/hr/suspension.schema';
import { QueryLetterController } from './api/v1/hr/query-letter.controller';
import { SuspensionController } from './api/v1/hr/suspension.controller';
import { QueryLetterService } from './services/hr/query-letter.service';
import { SuspensionService } from './services/hr/suspension.service';
import { House } from './schemas/property/house.schema';
import { InspectionRequest } from './schemas/property/inspection-request.schema';
import { Layout } from './schemas/property/layout.schema';
import { Plot } from './schemas/property/plot.schema';
import { DiscountOffer } from './schemas/property/discount-offer.schema';
import { Offer } from './schemas/sale/offer.schema';
import { OfferController } from './api/v1/sale-offer/sale-offer.controller';
import { DiscountOfferController } from './api/v1/discount-offer/discount-offer.controller';
import { OfferService } from './services/sale-offer/sale-offer.service';
import { DiscountOfferService } from './services/discount-offer/discount-offer.service';
import { AccountReceivableService } from './services/account/account-receivable.service';
import { AccountPayableService } from './services/account/account-payable.service';
import { CashBookService } from './services/account/cash-book.service';
import { PaymentRequestService } from './services/account/payment-request.service';
import { BankPaymentVoucherService } from './services/account/bank-payment-voucher.service';
import { BankPaymentVoucherLineService } from './services/account/bank-payment-voucher-line.service';
import { SalesAccountService } from './services/account/sales-account.service';
import { ProjectExpenseAnalysisService } from './services/account/project-expense-analysis.service';
import { PettyCashService } from './services/account/petty-cash.service';
import { AccountReceivableController } from './api/v1/account/account-receivable.controller';
import { AccountPayableController } from './api/v1/account/account-payable.controller';
import { CashBookController } from './api/v1/account/cash-book.controller';
import { PaymentRequestController } from './api/v1/account/payment-request.controller';
import { BankPaymentVoucherController } from './api/v1/account/bank-payment-voucher.controller';
import { BankPaymentVoucherLineController } from './api/v1/account/bank-payment-voucher-line.controller';
import { SalesAccountController } from './api/v1/account/sales-account.controller';
import { ProjectExpenseAnalysisController } from './api/v1/account/project-expense-analysis.controller';
import { PettyCashController } from './api/v1/account/petty-cash.controller';
import { AccountReceivable } from './schemas/accounting/account-receivable.schema';
import { AccountPayable } from './schemas/accounting/account-payable.schema';
import { CashBook } from './schemas/accounting/cash-book.schema';
import { BankPaymentVoucher } from './schemas/accounting/bank-payment-voucher.schema';
import { BankPaymentVoucherLine } from './schemas/accounting/bank-payment-voucher-line.schema';
import { SalesAccount } from './schemas/accounting/sales-account.schema';
import { ProjectExpenseAnalysis } from './schemas/accounting/project-expense-analysis.schema';
import { PettyCash } from './schemas/accounting/petty-cash.schema';
import { PaymentRequest } from './schemas/accounting/payment-request.schema';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      charset: 'utf8mb4',
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.schema{.ts,.js}'],
      synchronize: true,
      // logging: true,
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: true,
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      defaults: {
        from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      },
      template: {
        dir: join(__dirname, 'templates'),
        adapter: new EjsAdapter(),
        options: {
          strict: false,
        },
      },
    }),
    TypeOrmModule.forFeature([
      Analytic,
      Configuration,
      User,
      Request,
      NotificationDetail,
      Message,
      Webhook,
      Announcement,
      News,
      NewsSubscription,
      DiscountOffer,
      House,
      Faq,
      Debt,
      DebtPayment,
      Expense,
      Sale,
      Payment,
      Estate,
      MaterialType,
      Material,
      MaterialSupplyHistory,
      MaterialRequest,
      MaterialSupplyRequest,
      Allocation,
      Offer,
      Bill,
      Schedule,
      File,
      Complaint,
      InspectionRequest,
      Layout,
      Plot,
      Reservation,
      Payable,
      Account,
      AccountTransaction,
      Incident,
      FundRequest,
      Contact,
      ContactGroup,
      Broadcast,
      BroadcastLog,
      ChatThread,
      ChatParticipant,
      ChatMessage,
      Employee,
      Payroll,
      Leave,
      Attendance,
      Investment,
      InvestmentClosure,
      InvestmentSettlement,
      PaymentPlan,
      QueryLetter,
      Suspension,
      AccountReceivable,
      AccountPayable,
      CashBook,
      PaymentRequest,
      BankPaymentVoucher,
      BankPaymentVoucherLine,
      SalesAccount,
      ProjectExpenseAnalysis,
      PettyCash,
    ]),
    JwtModule.register({
      secret: process.env.APP_SECRET,
      signOptions: { expiresIn: '0' },
    }),
    PassportModule,
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: 'localhost',
          port: 6379,
        },
      }),
    }),
    BullModule.registerQueueAsync(
      {
        name: process.env.BULL_CHAT_QUEUE,
      },
      {
        name: process.env.BULL_EMAIL_QUEUE,
      },
      {
        name: process.env.BULL_SMS_QUEUE,
      },
      {
        name: process.env.BULL_NOTIFICATION_QUEUE,
      },
      {
        name: process.env.BULL_INTERNAL_NOTIFICATION_QUEUE,
      },
      {
        name: process.env.BULL_USER_ANALYTIC_QUEUE,
      },
      {
        name: process.env.BULL_BROADCAST_QUEUE,
      },
      {
        name: process.env.BULL_BROADCAST_RELEASE_QUEUE,
      },
      {
        name: process.env.BULL_BROADCAST_DISTRIBUTION_QUEUE,
      },
    ),
    PassportModule,
  ],
  controllers: [
    AppController,
    ConfigurationController,
    UserController,
    AuthController,
    FileController,
    ChatController,
    AnalyticController,
    MessageController,
    NotificationController,
    WebhookController,
    AnnouncementController,
    NewsController,
    FaqController,
    DiscountOfferController,
    OfferController,
    DebtController,
    DebtPaymentController,
    ExpenseController,
    SaleController,
    EstateController,
    MaterialTypeController,
    MaterialController,
    MaterialRequestController,
    MaterialSupplyRequestController,
    AllocationController,
    PaymentController,
    HouseController,
    BillController,
    ScheduleController,
    ComplaintController,
    InspectionRequestController,
    LayoutController,
    PlotController,
    ReservationController,
    IncidentController,
    FundRequestController,
    AccountController,
    ContactController,
    ContactGroupController,
    BroadcastController,
    BroadcastLogController,
    EmployeeController,
    PayrollController,
    AttendanceController,
    LeaveController,
    InvestmentController,
    InvestmentClosureController,
    InvestmentSettlementController,
    PaymentPlanController,
    QueryLetterController,
    SuspensionController,
    AccountReceivableController,
    AccountPayableController,
    CashBookController,
    PaymentRequestController,
    BankPaymentVoucherController,
    BankPaymentVoucherLineController,
    SalesAccountController,
    ProjectExpenseAnalysisController,
    PettyCashController,
  ],
  providers: [
    ConfigurationService,
    UserService,
    AuthService,
    CryptoService,
    AuthStrategy,
    FileService,
    MessagingService,
    ChatGateway,
    ChatService,
    EmailMessagesConsumer,
    SMSMessagesConsumer,
    NotificationMessagesConsumer,
    ProducerService,
    AnalyticService,
    FirebaseService,
    MessageService,
    NotificationService,
    WebhookService,
    AnnouncementService,
    NewsService,
    FaqService,
    OfferService,
    DiscountOfferService,
    DebtService,
    DebtPaymentService,
    ExpenseService,
    SaleService,
    EstateService,
    MaterialTypeService,
    MaterialService,
    MaterialRequestService,
    MaterialSupplyRequestService,
    PaymentService,
    AllocationService,
    HouseService,
    BillService,
    ScheduleService,
    ComplaintService,
    InspectionRequestService,
    LayoutService,
    PlotService,
    ReservationService,
    IncidentService,
    FundRequestService,
    AccountService,
    ContactService,
    ContactGroupService,
    BroadcastService,
    BroadcastLogService,
    AutoMessagingScheduler,
    EmployeeService,
    AttendanceService,
    PayrollService,
    LeaveService,
    InvestmentService,
    InvestmentSettlementService,
    InvestmentClosureService,
    PaymentPlanService,
    QueryLetterService,
    SuspensionService,
    AccountReceivableService,
    AccountPayableService,
    CashBookService,
    PaymentRequestService,
    BankPaymentVoucherService,
    BankPaymentVoucherLineService,
    SalesAccountService,
    ProjectExpenseAnalysisService,
    PettyCashService,
  ],
})
export class AppModule {}
