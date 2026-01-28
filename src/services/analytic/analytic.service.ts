import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../../dtos/ApiResponse.dto';
import * as NodeCache from 'node-cache';
import { Messages } from 'src/utils/messages/messages';
import { Between, In, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Helpers, Response } from 'src/helpers';
import { User } from 'src/schemas/user.schema';
import { DebtType, Department, StateStatus, UserRole } from 'src/enums';
import { NotificationDetail } from 'src/schemas/notification-detail.schema';
import { Message } from 'src/schemas/company/message.schema';
import { Debt } from 'src/schemas/accounting/debt.schema';
import { Expense } from 'src/schemas/accounting/expense.schema';
import { Payment } from 'src/schemas/sale/payment.schema';
import { Sale } from 'src/schemas/sale/sale.schema';
import { FilterDto } from 'src/dtos/filter.dto';
import { Estate } from 'src/schemas/property/estate.schema';
import { DebtPayment } from 'src/schemas/accounting/debt-payment.schema';
import { Allocation } from 'src/schemas/sale/allocation.schema';
import { Material } from 'src/schemas/inventory/material.schema';
import { MaterialRequest } from 'src/schemas/inventory/material-request.schema';
import { Schedule } from 'src/schemas/schedule.schema';
import { Bill } from 'src/schemas/bill.schema';
import { Complaint } from 'src/schemas/complaint.schema';
import { Announcement } from 'src/schemas/announcement.schema';
import {
  subMonths,
  startOfDay,
  startOfMonth,
  endOfDay,
  endOfMonth,
} from 'date-fns';
import { Reservation } from 'src/schemas/sale/reservation.schema';
import { News } from 'src/schemas/company/news.schema';
import { Incident } from 'src/schemas/incident.schema';
import { FundRequest } from 'src/schemas/accounting/fund-request.schema';
import { Employee } from 'src/schemas/hr/employee.schema';
import { Leave } from 'src/schemas/hr/leave.schema';
import { Payroll } from 'src/schemas/hr/payroll.schema';
import { Attendance } from 'src/schemas/hr/attendance.schema';
import { DiscountOffer } from 'src/schemas/property/discount-offer.schema';
import { House } from 'src/schemas/property/house.schema';
import { Plot } from 'src/schemas/property/plot.schema';
import { Layout } from 'src/schemas/property/layout.schema';
import { InspectionRequest } from 'src/schemas/property/inspection-request.schema';

@Injectable()
export class AnalyticService {
  cache = new NodeCache();
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Message) private feedbackRepo: Repository<Message>,
    @InjectRepository(Debt) private debtRepo: Repository<Debt>,
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(DiscountOffer) private discountOfferRepo: Repository<DiscountOffer>,
    @InjectRepository(House) private houseRepo: Repository<House>,
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Estate) private estateRepo: Repository<Estate>,
    @InjectRepository(Plot) private plotRepo: Repository<Plot>,
    @InjectRepository(Incident) private incidentRepo: Repository<Incident>,
    @InjectRepository(FundRequest)
    private fundRequestRepo: Repository<FundRequest>,
    @InjectRepository(DebtPayment)
    private debtRecoveryRepo: Repository<DebtPayment>,
    @InjectRepository(MaterialRequest)
    private materialRequestRepo: Repository<MaterialRequest>,
    @InjectRepository(Allocation)
    private allocationRepo: Repository<Allocation>,
    @InjectRepository(NotificationDetail)
    private notificationRepo: Repository<NotificationDetail>,
    @InjectRepository(Layout)
    private layoutRepo: Repository<Layout>,
    @InjectRepository(Announcement)
    private annoucementRepo: Repository<Announcement>,
    @InjectRepository(News)
    private newsRepo: Repository<News>,
    @InjectRepository(Schedule) private scheduleRepo: Repository<Schedule>,
    @InjectRepository(Bill) private billeRepo: Repository<Bill>,
    @InjectRepository(InspectionRequest)
    private inspectionRequestRepo: Repository<InspectionRequest>,
    @InjectRepository(Complaint) private complaintRepo: Repository<Complaint>,
    @InjectRepository(Material) private materialRepo: Repository<Material>,
    @InjectRepository(Reservation)
    private reservationRepo: Repository<Reservation>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    @InjectRepository(Leave) private leaveRepo: Repository<Leave>,
    @InjectRepository(Payroll) private payrollRepo: Repository<Payroll>,
    @InjectRepository(Attendance)
    private attendanceRepo: Repository<Attendance>,
  ) {}

  async findAllAnalytics(
    authenticatedUser: User,
    filterDto: FilterDto,
  ): Promise<ApiResponse> {
    try {
      const query = {} as any;

      if (filterDto.from || filterDto.to) {
        query.createdAt = Between(
          Helpers.formatDate(
            new Date(filterDto.from ?? Helpers.formatDate(new Date())),
          ),
          Helpers.formatToNextDay(
            new Date(filterDto.to ?? Helpers.formatDate(new Date())),
          ),
        );
      }
      let complaints, resolvedComplaints, rejectedComplaints, pendingComplaints;
      complaints =
        resolvedComplaints =
        rejectedComplaints =
        pendingComplaints =
          0;

      //get complaints analytic
      if (authenticatedUser.role == UserRole.MANAGER) {
        complaints = await this.complaintRepo.count({
          where: { department: Department.MANAGEMENT },
        });
        resolvedComplaints = await this.complaintRepo.count({
          where: {
            status: StateStatus.RESOLVED,
            department: Department.MANAGEMENT,
          },
        });
        rejectedComplaints = await this.complaintRepo.count({
          where: {
            status: StateStatus.DECLINED,
            department: Department.MANAGEMENT,
          },
        });
        pendingComplaints = await this.complaintRepo.count({
          where: {
            status: StateStatus.PENDING,
            department: Department.MANAGEMENT,
          },
        });
      } else if (authenticatedUser.role == UserRole.LEADENGINEER) {
        complaints = await this.complaintRepo.count({
          where: { department: Department.ENGINEERING },
        });
        resolvedComplaints = await this.complaintRepo.count({
          where: {
            status: StateStatus.RESOLVED,
            department: Department.ENGINEERING,
          },
        });
        rejectedComplaints = await this.complaintRepo.count({
          where: {
            status: StateStatus.DECLINED,
            department: Department.ENGINEERING,
          },
        });
        pendingComplaints = await this.complaintRepo.count({
          where: {
            status: StateStatus.PENDING,
            department: Department.ENGINEERING,
          },
        });
      } else if (authenticatedUser.role == UserRole.CUSTOMERCARE) {
        complaints = await this.complaintRepo.count({
          where: { department: Department.ENGINEERING },
        });
        resolvedComplaints = await this.complaintRepo.count({
          where: {
            status: StateStatus.RESOLVED,
            department: Department.MARKETING,
          },
        });
        rejectedComplaints = await this.complaintRepo.count({
          where: {
            status: StateStatus.DECLINED,
            department: Department.MARKETING,
          },
        });
        pendingComplaints = await this.complaintRepo.count({
          where: {
            status: StateStatus.PENDING,
            department: Department.MARKETING,
          },
        });
      } else {
        complaints = await this.complaintRepo.count({
          where: {
            department: Department.ENGINEERING,
            createdById: authenticatedUser.id,
          },
        });
        resolvedComplaints = await this.complaintRepo.count({
          where: {
            status: StateStatus.RESOLVED,
            createdById: authenticatedUser.id,
          },
        });
        rejectedComplaints = await this.complaintRepo.count({
          where: {
            status: StateStatus.DECLINED,
            createdById: authenticatedUser.id,
          },
        });
        pendingComplaints = await this.complaintRepo.count({
          where: {
            status: StateStatus.PENDING,
            createdById: authenticatedUser.id,
          },
        });
      }
      let analytic = {
        complaints,
        resolvedComplaints,
        rejectedComplaints,
        pendingComplaints,
      };

      if (authenticatedUser.role == UserRole.CLIENT) {
        analytic = {
          ...analytic,
          ...(await await this.getClientAnalytics(authenticatedUser)),
        };
      } else if (authenticatedUser.role == UserRole.AGENT) {
        analytic = {
          ...analytic,
          ...(await this.getAgentsAnalytics(authenticatedUser)),
        };
      } else if (authenticatedUser.role == UserRole.SITEENGINEER) {
        analytic = {
          ...analytic,
          ...(await this.getSiteEngineersAnalytics(authenticatedUser)),
        };
      } else if (authenticatedUser.role == UserRole.LEADENGINEER) {
        analytic = {
          ...analytic,
          ...(await this.getLeadEngineerAnalytics(authenticatedUser)),
        };
      } else if (authenticatedUser.role == UserRole.STOREKEEPER) {
        analytic = {
          ...analytic,
          ...(await this.getStoreKeepernalytics(authenticatedUser)),
        };
      } else if (authenticatedUser.role == UserRole.HR) {
        analytic = {
          ...analytic,
          ...(await this.getHrAnalytics(authenticatedUser)),
        };
      } else if (authenticatedUser.role == UserRole.ACCOUNTANT) {
        analytic = {
          ...analytic,
          ...(await this.getAccountantAnalytics(authenticatedUser)),
        };
      } else {
        analytic = {
          ...analytic,
          ...(await this.getAdminAnalytics(authenticatedUser)),
        };
      }

      return Response.success(analytic);
    } catch (ex) {
      console.log(Messages.Exception, ex);
      return Response.failure(Messages.Exception);
    }
  }

  getAdminAnalytics = async (authenticatedUser: User): Promise<any> => {
    const today = new Date();
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const thisMonthStart = startOfMonth(today);
    const thisMonthEnd = endOfDay(today);

    const startMonth = startOfMonth(today);
    const endMonth = endOfMonth(today);
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // HR MODULE REPOS (inject these in constructor)
    // employeeRepo, leaveRepo, payrollRepo, attendanceRepo

    // -------- HR: EMPLOYEE METRICS --------
    const totalEmployees = await this.employeeRepo.count();
    const activeEmployees = await this.employeeRepo.count({
      where: { status: StateStatus.ACTIVE },
    });
    const inactiveEmployees = await this.employeeRepo.count({
      where: { status: StateStatus.INACTIVE },
    });
    const newEmployeesThisMonth = await this.employeeRepo.count({
      where: { createdAt: Between(startMonth, endMonth) },
    });

    // -------- HR: LEAVE METRICS --------
    const totalLeaves = await this.leaveRepo.count();
    const pendingLeaves = await this.leaveRepo.count({
      where: { status: StateStatus.PENDING },
    });
    const approvedLeaves = await this.leaveRepo.count({
      where: { status: StateStatus.APPROVED },
    });
    const rejectedLeaves = await this.leaveRepo.count({
      where: { status: In([StateStatus.CANCELED, StateStatus.DECLINED]) },
    });

    // -------- HR: ATTENDANCE METRICS --------
    const attendanceTodayTotal = await this.attendanceRepo.count({
      where: { date: Between(todayStart, todayEnd) },
    });

    const attendanceTodayPresent = await this.attendanceRepo.count({
      where: { date: Between(todayStart, todayEnd), isAbsent: false },
    });

    const attendanceTodayAbsent = await this.attendanceRepo.count({
      where: { date: Between(todayStart, todayEnd), isAbsent: true },
    });

    const attendanceTodayLate = await this.attendanceRepo.count({
      where: { date: Between(todayStart, todayEnd), isLate: true },
    });

    const attendanceMonthTotal = await this.attendanceRepo.count({
      where: { date: Between(startMonth, endMonth) },
    });

    const attendanceMonthOvertime =
      (
        await this.attendanceRepo
          .createQueryBuilder('a')
          .select('SUM(a.overtimeHours)', 'overtime')
          .getRawOne()
      )?.overtime || 0;

    // -------- HR: PAYROLL METRICS --------
    const totalPayrollRecords = await this.payrollRepo.count();

    const processedPayrolls = await this.payrollRepo.count({
      where: { status: StateStatus.APPROVED },
    });

    const pendingPayrolls = await this.payrollRepo.count({
      where: { status: StateStatus.PENDING },
    });

    const totalPayrollAmount =
      (
        await this.payrollRepo
          .createQueryBuilder('p')
          .select('SUM(p.netPay)', 'sum')
          .getRawOne()
      )?.sum || 0;

    const paidPayrollAmount =
      (
        await this.payrollRepo
          .createQueryBuilder('p')
          .select('SUM(p.netPay)', 'sum')
          .where('p.status = :status', { status: StateStatus.APPROVED })
          .getRawOne()
      )?.sum || 0;

    const pendingPayrollAmount =
      (
        await this.payrollRepo
          .createQueryBuilder('p')
          .select('SUM(p.netPay)', 'sum')
          .where('p.status = :status', { status: StateStatus.PENDING })
          .getRawOne()
      )?.sum || 0;

    return {
      // -------------------
      // ORIGINAL ANALYTICS
      // -------------------
      sales: await this.saleRepo.count(),
      debts: await this.debtRepo.count(),
      expenses: await this.expenseRepo.count(),
      payments: await this.paymentRepo.count(),
      upcomingSales: await this.saleRepo.count({
        where: { status: StateStatus.PENDING },
      }),
      pendingSales: await this.saleRepo.count({
        where: { status: StateStatus.PENDING },
      }),
      totalSaleUcomingAmount: await this.saleRepo.sum('totalPayableAmount', {
        status: StateStatus.PENDING,
      }),
      totalSalePaidAmount: await this.saleRepo.sum('paidAmount', {
        paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]),
      }),
      totalSalePayableAmount: await this.saleRepo.sum('totalPayableAmount', {
        paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]),
      }),
      totalSaleOutstandingAmount:
        (
          await this.saleRepo
            .createQueryBuilder('sale')
            .select(
              'SUM(sale.totalPayableAmount - sale.paidAmount)',
              'outstanding',
            )
            .where('sale.paymentStatus IN (:...statuses)', {
              statuses: [StateStatus.PAID, StateStatus.PAYING],
            })
            .getRawOne()
        )?.outstanding || 0,

      allocations: await this.allocationRepo.count(),
      totalPayments: await this.paymentRepo.count(),
      totalSales: await this.saleRepo.count(),
      totalPaidSales: await this.saleRepo.count({
        where: { paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]) },
      }),

      totalReceivableDebt: await this.debtRepo.sum('amount', {
        type: DebtType.Receivable,
      }),
      totalPayableDebt: await this.debtRepo.sum('amount', {
        type: DebtType.Payable,
      }),
      totalDebt: await this.debtRepo.sum('amount'),

      availableHouses: await this.houseRepo.count({
        where: { status: StateStatus.AVAILABLE },
      }),
      reservedHouses: await this.houseRepo.count({
        where: { status: StateStatus.RESERVED },
      }),
      soldHouses: await this.houseRepo.count({
        where: { status: StateStatus.SOLD },
      }),
      houses: await this.houseRepo.count(),

      plots: await this.plotRepo.count(),
      availablePlots: await this.plotRepo.count({
        where: { status: StateStatus.AVAILABLE },
      }),
      reservedPlots: await this.plotRepo.count({
        where: { status: StateStatus.RESERVED },
      }),
      soldPlots: await this.plotRepo.count(),

      inspectionRequests: await this.inspectionRequestRepo.count(),
      pendingInspectionRequests: await this.inspectionRequestRepo.count({
        where: { status: StateStatus.PENDING },
      }),
      approvedInspectionRequests: await this.inspectionRequestRepo.count({
        where: { status: StateStatus.APPROVED },
      }),
      rescheduledInspectionRequests: await this.inspectionRequestRepo.count({
        where: { status: StateStatus.RESCHEDULED },
      }),
      canceledInspectionRequests: await this.inspectionRequestRepo.count({
        where: { status: StateStatus.CANCELED },
      }),
      completedInspectionRequests: await this.inspectionRequestRepo.count({
        where: { status: StateStatus.COMPLETED },
      }),

      pendingWorkBills: await this.billeRepo.count({
        where: { status: StateStatus.PENDING },
      }),
      approvedWorkBills: await this.billeRepo.count({
        where: { status: StateStatus.APPROVED },
      }),
      canceledWorkBills: await this.billeRepo.count({
        where: { status: StateStatus.DECLINED },
      }),
      settledWorkBills: await this.billeRepo.count({
        where: {
          status: StateStatus.SETTLED,
        },
      }),
      partiallySettledWorkBills: await this.billeRepo.count({
        where: {
          status: StateStatus.PARTIALLYSETTLED,
        },
      }),
      totalWorkBillAmountPending: await this.billeRepo.sum('amount', {
        status: StateStatus.PENDING,
      }),
      totalWorkBillAmountApproved: await this.billeRepo.sum('approvedAmount', {
        status: StateStatus.APPROVED,
      }),
      totalWorkBillAmountSettled: await this.billeRepo.sum('paidAmount', {
        status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
      }),

      totalIncidentAmountPending: await this.incidentRepo.sum('amount', {
        status: StateStatus.PENDING,
      }),
      totalIncidentAmountApproved: await this.incidentRepo.sum(
        'approvedAmount',
        { status: StateStatus.APPROVED },
      ),
      totalIncidentAmountSettled: await this.incidentRepo.sum('paidAmount', {
        status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
      }),

      totalFundRequestAmountPending: await this.fundRequestRepo.sum('amount', {
        status: StateStatus.PENDING,
      }),
      totalFundRequestAmountApproved: await this.fundRequestRepo.sum(
        'approvedAmount',
        { status: StateStatus.APPROVED },
      ),
      totalFundRequestAmountSettled: await this.fundRequestRepo.sum(
        'paidAmount',
        {
          status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
        },
      ),

      threeMonthWorkSchedules: await this.scheduleRepo.count({
        where: {
          createdAt: Between(startOfDay(subMonths(today, 3)), today),
        },
      }),
      lastMonthWorkSchedules: await this.scheduleRepo.count({
        where: {
          createdAt: Between(lastMonthStart, thisMonthEnd),
        },
      }),
      thisMonthWorkSchedules: await this.scheduleRepo.count({
        where: {
          createdAt: Between(thisMonthStart, thisMonthEnd),
        },
      }),
      schedules: await this.scheduleRepo.count({
        where: { createdById: authenticatedUser.id },
      }),

      availableMaterials: await this.materialRepo.count({
        where: { quantityLeft: MoreThan(0) },
      }),
      finishedMaterials: await this.materialRepo.count({
        where: { quantityLeft: LessThanOrEqual(0) },
      }),

      reservations: await this.reservationRepo.count(),
      feedbacks: await this.feedbackRepo.count(),
      repliedFeedbacks: await this.feedbackRepo.count({
        where: { status: StateStatus.REPLIED },
      }),

      offers: await this.discountOfferRepo.count(),
      totalExpense: await this.expenseRepo.sum('amount'),
      notifications: await this.notificationRepo.count(),
      estates: await this.estateRepo.count(),
      layouts: await this.layoutRepo.count(),

      materialRequests: await this.materialRequestRepo.count(),
      approvedMaterialRequests: await this.materialRequestRepo.count({
        where: { status: StateStatus.APPROVED },
      }),
      declinedMaterialRequests: await this.materialRequestRepo.count({
        where: { status: StateStatus.DECLINED },
      }),
      releasedMaterialRequests: await this.materialRequestRepo.count({
        where: { status: StateStatus.RELEASED },
      }),

      annoucements: await this.annoucementRepo.count(),
      clients: await this.userRepo.count({
        where: { role: UserRole.CLIENT },
      }),

      // -----------------------
      // APPENDED HR ANALYTICS
      // -----------------------
      employees: totalEmployees,
      activeEmployees,
      inactiveEmployees,
      newEmployeesThisMonth,

      totalLeaves,
      pendingLeaves,
      approvedLeaves,
      rejectedLeaves,

      attendanceTodayTotal,
      attendanceTodayPresent,
      attendanceTodayAbsent,
      attendanceTodayLate,
      attendanceMonthTotal,
      attendanceMonthOvertime: Number(attendanceMonthOvertime || 0),

      totalPayrollRecords,
      processedPayrolls,
      pendingPayrolls,
      totalPayrollAmount: Number(totalPayrollAmount),
      paidPayrollAmount: Number(paidPayrollAmount),
      pendingPayrollAmount: Number(pendingPayrollAmount),
    };
  };

  getStoreKeepernalytics = async (authenticatedUser: User): Promise<any> => {
    const today = new Date();
    return {
      //inventory
      availableMaterials: await this.materialRepo.count({
        where: { quantityLeft: MoreThan(0) },
      }),
      finishedMaterials: await this.materialRepo.count({
        where: { quantityLeft: LessThanOrEqual(0) },
      }),
      materialRequests: await this.materialRequestRepo.count(),
      approvedMaterialRequests: await this.materialRequestRepo.count({
        where: { status: StateStatus.APPROVED },
      }),
      declinedMaterialRequests: await this.materialRequestRepo.count({
        where: { status: StateStatus.DECLINED },
      }),
      releasedMaterialRequests: await this.materialRequestRepo.count({
        where: { status: StateStatus.RELEASED },
      }),
      annoucements: await this.annoucementRepo.count(),
      news: await this.newsRepo.count(),
      totalIncidentAmountPending: await this.incidentRepo.sum('amount', {
        status: StateStatus.PENDING,
      }),
      totalIncidentAmountApproved: await this.incidentRepo.sum(
        'approvedAmount',
        {
          status: StateStatus.APPROVED,
        },
      ),
      totalIncidentAmountSettled: await this.incidentRepo.sum('paidAmount', {
        status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
      }),

      ///fund request
      totalFundRequestAmountPending: await this.fundRequestRepo.sum('amount', {
        status: StateStatus.PENDING,
      }),
      totalFundRequestAmountApproved: await this.fundRequestRepo.sum(
        'approvedAmount',
        {
          status: StateStatus.APPROVED,
        },
      ),
      totalFundRequestAmountSettled: await this.fundRequestRepo.sum(
        'paidAmount',
        {
          status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
        },
      ),
    } as any;
  };

  getClientAnalytics = async (authenticatedUser: User): Promise<any> => {
    return {
      sales: await this.saleRepo.count({
        where: { clientId: authenticatedUser.id },
      }),
      payments: await this.paymentRepo.count({
        where: { clientId: authenticatedUser.id },
      }),
      upcomingSales: await this.saleRepo.count({
        where: { status: StateStatus.PENDING, clientId: authenticatedUser.id },
      }),
      pendingSales: await this.saleRepo.count({
        where: { status: StateStatus.PENDING, clientId: authenticatedUser.id },
      }),
      totalSaleUcomingAmount: await this.saleRepo.sum('totalPayableAmount', {
        status: StateStatus.PENDING,
        clientId: authenticatedUser.id,
      }),
      totalSalePaidAmount: await this.saleRepo.sum('paidAmount', {
        paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]),
        clientId: authenticatedUser.id,
      }),
      totalSalePayableAmount: await this.saleRepo.sum('totalPayableAmount', {
        paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]),
        clientId: authenticatedUser.id,
      }),
      totalSaleOutstandingAmount:
        (
          await this.saleRepo
            .createQueryBuilder('sale')
            .select(
              'SUM(sale.totalPayableAmount - sale.paidAmount)',
              'outstanding',
            )
            .where(
              'sale.paymentStatus IN (:...statuses) AND clientId =:clientId',
              {
                statuses: [StateStatus.PAID, StateStatus.PAYING],
                clientId: authenticatedUser.id,
              },
            )
            .getRawOne()
        )?.outstanding || 0,
      totalSales: await this.saleRepo.count({
        where: { clientId: authenticatedUser.id },
      }),
      totalPaidSales: await this.saleRepo.count({
        where: {
          paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]),
          clientId: authenticatedUser.id,
        },
      }),

      //houses
      availableHouses: await this.houseRepo.count({
        where: { status: StateStatus.AVAILABLE },
      }),
      reservedHouses: await this.houseRepo.count({
        where: {
          status: StateStatus.RESERVED,
          reservationId: authenticatedUser.id,
        },
      }),
      houses: await this.houseRepo.count({
        where: { clientId: authenticatedUser.id },
      }),

      //plots
      plots: await this.plotRepo.count({
        where: { clientId: authenticatedUser.id },
      }),
      availablePlots: await this.plotRepo.count({
        where: { status: StateStatus.AVAILABLE },
      }),
      reservedPlots: await this.plotRepo.count({
        where: {
          status: StateStatus.RESERVED,
          reservationId: authenticatedUser.id,
        },
      }),

      //inspection requests
      inspectionRequests: await this.inspectionRequestRepo.count(),
      pendingInspectionRequests: await this.inspectionRequestRepo.count({
        where: {
          status: StateStatus.PENDING,
          createdById: authenticatedUser.id,
        },
      }),
      approvedInspectionRequests: await this.inspectionRequestRepo.count({
        where: {
          status: StateStatus.APPROVED,
          createdById: authenticatedUser.id,
        },
      }),
      rescheduledInspectionRequests: await this.inspectionRequestRepo.count({
        where: {
          status: StateStatus.RESCHEDULED,
          createdById: authenticatedUser.id,
        },
      }),
      canceledInspectionRequests: await this.inspectionRequestRepo.count({
        where: {
          status: StateStatus.CANCELED,
          createdById: authenticatedUser.id,
        },
      }),
      completedInspectionRequests: await this.inspectionRequestRepo.count({
        where: {
          status: StateStatus.COMPLETED,
          createdById: authenticatedUser.id,
        },
      }),
      reservations: await this.reservationRepo.count({
        where: {
          createdById: authenticatedUser.id,
        },
      }),
      news: await this.newsRepo.count(),
      annoucements: await this.annoucementRepo.count(),
    } as any;
  };

  getAgentsAnalytics = async (authenticatedUser: User): Promise<any> => {
    return {
      sales: await this.saleRepo.count({
        where: { agentId: authenticatedUser.id },
      }),
      upcomingSales: await this.saleRepo.count({
        where: { status: StateStatus.PENDING, agentId: authenticatedUser.id },
      }),
      pendingSales: await this.saleRepo.count({
        where: { status: StateStatus.PENDING, agentId: authenticatedUser.id },
      }),
      totalSaleUcomingAmount: await this.saleRepo.sum('totalPayableAmount', {
        status: StateStatus.PENDING,
        agentId: authenticatedUser.id,
      }),
      totalSalePaidAmount: await this.saleRepo.sum('paidAmount', {
        paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]),
        agentId: authenticatedUser.id,
      }),
      totalSalePayableAmount: await this.saleRepo.sum('totalPayableAmount', {
        paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]),
        agentId: authenticatedUser.id,
      }),
      totalSaleOutstandingAmount:
        (
          await this.saleRepo
            .createQueryBuilder('sale')
            .select(
              'SUM(sale.totalPayableAmount - sale.paidAmount)',
              'outstanding',
            )
            .where(
              'sale.paymentStatus IN (:...statuses) AND agentId =:agentId',
              {
                statuses: [StateStatus.PAID, StateStatus.PAYING],
                agentId: authenticatedUser.id,
              },
            )
            .getRawOne()
        )?.outstanding || 0,
      totalSales: await this.saleRepo.count({
        where: { agentId: authenticatedUser.id },
      }),
      totalPaidSales: await this.saleRepo.count({
        where: {
          paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]),
          agentId: authenticatedUser.id,
        },
      }),
      //houses
      availableHouses: await this.houseRepo.count({
        where: { status: StateStatus.AVAILABLE },
      }),
      houses: await this.houseRepo.count(),
      //plots
      plots: await this.plotRepo.count(),
      availablePlots: await this.plotRepo.count({
        where: { status: StateStatus.AVAILABLE },
      }),
      //inspection requests
      inspectionRequests: await this.inspectionRequestRepo.count(),
      pendingInspectionRequests: await this.inspectionRequestRepo.count({
        where: {
          status: StateStatus.PENDING,
          createdById: authenticatedUser.id,
        },
      }),
      approvedInspectionRequests: await this.inspectionRequestRepo.count({
        where: {
          status: StateStatus.APPROVED,
          createdById: authenticatedUser.id,
        },
      }),
      rescheduledInspectionRequests: await this.inspectionRequestRepo.count({
        where: {
          status: StateStatus.RESCHEDULED,
          createdById: authenticatedUser.id,
        },
      }),
      canceledInspectionRequests: await this.inspectionRequestRepo.count({
        where: {
          status: StateStatus.CANCELED,
          createdById: authenticatedUser.id,
        },
      }),
      completedInspectionRequests: await this.inspectionRequestRepo.count({
        where: {
          status: StateStatus.COMPLETED,
          createdById: authenticatedUser.id,
        },
      }),
      reservations: await this.reservationRepo.count({
        where: {
          createdById: authenticatedUser.id,
        },
      }),
      news: await this.newsRepo.count(),
      annoucements: await this.annoucementRepo.count(),
      //agent
      estimatedIncome: await this.saleRepo.sum('agencyFee', {
        agentId: authenticatedUser.id,
      }),
      totalIncome: await this.saleRepo.sum('agencyFee', {
        agentId: authenticatedUser.id,
        status: StateStatus.SOLD,
      }),
      pendingIncome: await this.saleRepo.sum('agencyFee', {
        agentId: authenticatedUser.id,
        status: StateStatus.PENDING,
      }),
    } as any;
  };

  getSiteEngineersAnalytics = async (authenticatedUser: User): Promise<any> => {
    const today = new Date();
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const thisMonthStart = startOfMonth(today);
    const thisMonthEnd = endOfDay(today);

    return {
      //bills
      pendingWorkBills: await this.billeRepo.count({
        where: {
          status: StateStatus.PENDING,
          createdById: authenticatedUser.id,
        },
      }),
      approvedWorkBills: await this.billeRepo.count({
        where: {
          status: StateStatus.APPROVED,
          createdById: authenticatedUser.id,
        },
      }),
      canceledWorkBills: await this.billeRepo.count({
        where: {
          status: StateStatus.DECLINED,
          createdById: authenticatedUser.id,
        },
      }),
      settledWorkBills: await this.billeRepo.count({
        where: {
          status: StateStatus.SETTLED,
          createdById: authenticatedUser.id,
        },
      }),
      partiallySettledWorkBills: await this.billeRepo.count({
        where: {
          status: StateStatus.PARTIALLYSETTLED,
          createdById: authenticatedUser.id,
        },
      }),

      totalWorkBillAmountPending: await this.billeRepo.sum('amount', {
        status: StateStatus.PENDING,
        createdById: authenticatedUser.id,
      }),
      totalWorkBillAmountApproved: await this.billeRepo.sum('approvedAmount', {
        status: StateStatus.APPROVED,
        createdById: authenticatedUser.id,
      }),
      totalWorkBillAmountSettled: await this.billeRepo.sum('paidAmount', {
        status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
        createdById: authenticatedUser.id,
      }),
      //incident
      totalIncidentAmountPending: await this.incidentRepo.sum('amount', {
        status: StateStatus.PENDING,
      }),
      totalIncidentAmountApproved: await this.incidentRepo.sum(
        'approvedAmount',
        {
          status: StateStatus.APPROVED,
        },
      ),
      totalIncidentAmountSettled: await this.incidentRepo.sum('paidAmount', {
        status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
      }),

      ///fund request
      totalFundRequestAmountPending: await this.fundRequestRepo.sum('amount', {
        status: StateStatus.PENDING,
      }),
      totalFundRequestAmountApproved: await this.fundRequestRepo.sum(
        'approvedAmount',
        {
          status: StateStatus.APPROVED,
        },
      ),
      totalFundRequestAmountSettled: await this.fundRequestRepo.sum(
        'paidAmount',
        {
          status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
        },
      ),

      //schedules
      threeMonthWorkSchedules: await this.scheduleRepo.count({
        where: {
          createdAt: Between(startOfDay(subMonths(today, 3)), today),
          createdById: authenticatedUser.id,
        },
      }),
      lastMonthWorkSchedules: await this.scheduleRepo.count({
        where: {
          createdAt: Between(lastMonthStart, thisMonthEnd),
          createdById: authenticatedUser.id,
        },
      }),
      thisMonthWorkSchedules: await this.scheduleRepo.count({
        where: {
          createdAt: Between(thisMonthStart, thisMonthEnd),
          createdById: authenticatedUser.id,
        },
      }),
      schedules: await this.scheduleRepo.count({
        where: {
          createdById: authenticatedUser.id,
        },
      }),
      //inventory
      materialRequests: await this.materialRequestRepo.count({
        where: { createdById: authenticatedUser.id },
      }),
      approvedMaterialRequests: await this.materialRequestRepo.count({
        where: {
          status: StateStatus.APPROVED,
          createdById: authenticatedUser.id,
        },
      }),
      declinedMaterialRequests: await this.materialRequestRepo.count({
        where: {
          status: StateStatus.DECLINED,
          createdById: authenticatedUser.id,
        },
      }),
      releasedMaterialRequests: await this.materialRequestRepo.count({
        where: {
          status: StateStatus.RELEASED,
          createdById: authenticatedUser.id,
        },
      }),
      news: await this.newsRepo.count(),
      annoucements: await this.annoucementRepo.count(),
    } as any;
  };

  getLeadEngineerAnalytics = async (authenticatedUser: User): Promise<any> => {
    const today = new Date();
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const thisMonthStart = startOfMonth(today);
    const thisMonthEnd = endOfDay(today);

    return {
      //bills
      pendingWorkBills: await this.billeRepo.count({
        where: {
          status: StateStatus.PENDING,
        },
      }),
      approvedWorkBills: await this.billeRepo.count({
        where: {
          status: StateStatus.APPROVED,
        },
      }),
      canceledWorkBills: await this.billeRepo.count({
        where: {
          status: StateStatus.DECLINED,
        },
      }),
      settledWorkBills: await this.billeRepo.count({
        where: {
          status: StateStatus.SETTLED,
        },
      }),
      partiallySettledWorkBills: await this.billeRepo.count({
        where: {
          status: StateStatus.PARTIALLYSETTLED,
        },
      }),
      totalWorkBillAmountPending: await this.billeRepo.sum('amount', {
        status: StateStatus.PENDING,
      }),
      totalWorkBillAmountApproved: await this.billeRepo.sum('approvedAmount', {
        status: StateStatus.APPROVED,
      }),
      totalWorkBillAmountSettled: await this.billeRepo.sum('paidAmount', {
        status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
      }),
      totalIncidentAmountPending: await this.incidentRepo.sum('amount', {
        status: StateStatus.PENDING,
      }),
      totalIncidentAmountApproved: await this.incidentRepo.sum(
        'approvedAmount',
        {
          status: StateStatus.APPROVED,
        },
      ),
      totalIncidentAmountSettled: await this.incidentRepo.sum('paidAmount', {
        status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
      }),
      ///fund request
      totalFundRequestAmountPending: await this.fundRequestRepo.sum('amount', {
        status: StateStatus.PENDING,
      }),
      totalFundRequestAmountApproved: await this.fundRequestRepo.sum(
        'approvedAmount',
        {
          status: StateStatus.APPROVED,
        },
      ),
      totalFundRequestAmountSettled: await this.fundRequestRepo.sum(
        'paidAmount',
        {
          status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
        },
      ),

      //schedules
      threeMonthWorkSchedules: await this.scheduleRepo.count({
        where: {
          createdAt: Between(startOfDay(subMonths(today, 3)), today),
        },
      }),
      lastMonthWorkSchedules: await this.scheduleRepo.count({
        where: {
          createdAt: Between(lastMonthStart, thisMonthEnd),
        },
      }),
      thisMonthWorkSchedules: await this.scheduleRepo.count({
        where: {
          createdAt: Between(thisMonthStart, thisMonthEnd),
        },
      }),
      schedules: await this.scheduleRepo.count(),
      //inventory
      materialRequests: await this.materialRequestRepo.count(),
      approvedMaterialRequests: await this.materialRequestRepo.count({
        where: {
          status: StateStatus.APPROVED,
        },
      }),
      declinedMaterialRequests: await this.materialRequestRepo.count({
        where: {
          status: StateStatus.DECLINED,
        },
      }),
      releasedMaterialRequests: await this.materialRequestRepo.count({
        where: { status: StateStatus.RELEASED },
      }),
      news: await this.newsRepo.count(),
      annoucements: await this.annoucementRepo.count(),
    } as any;
  };

  async getHrAnalytics(authenticatedUser: User): Promise<any> {
    const today = new Date();
    const startMonth = startOfMonth(today);
    const endMonth = endOfMonth(today);

    // --- EMPLOYEE METRICS ---
    const totalEmployees = await this.employeeRepo.count();
    const activeEmployees = await this.employeeRepo.count({
      where: { status: StateStatus.ACTIVE },
    });
    const inactiveEmployees = await this.employeeRepo.count({
      where: { status: StateStatus.INACTIVE },
    });
    const newThisMonth = await this.employeeRepo.count({
      where: {
        createdAt: Between(startMonth, endMonth),
      },
    });

    // --- LEAVE METRICS ---
    const totalLeaves = await this.leaveRepo.count();
    const pendingLeaves = await this.leaveRepo.count({
      where: { status: StateStatus.PENDING },
    });
    const approvedLeaves = await this.leaveRepo.count({
      where: { status: StateStatus.APPROVED },
    });
    const rejectedLeaves = await this.leaveRepo.count({
      where: { status: In([StateStatus.DECLINED, StateStatus.CANCELED]) },
    });
    const currentMonthLeaves = await this.leaveRepo.count({
      where: { createdAt: Between(startMonth, endMonth) },
    });

    // --- ATTENDANCE METRICS ---
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const totalAttendanceToday = await this.attendanceRepo.count({
      where: { date: Between(todayStart, todayEnd) },
    });
    const presentToday = await this.attendanceRepo.count({
      where: {
        date: Between(todayStart, todayEnd),
        isAbsent: false,
      },
    });
    const absentToday = await this.attendanceRepo.count({
      where: {
        date: Between(todayStart, todayEnd),
        isAbsent: true,
      },
    });
    const lateToday = await this.attendanceRepo.count({
      where: {
        date: Between(todayStart, todayEnd),
        isLate: true,
      },
    });

    const totalAttendanceMonth = await this.attendanceRepo.count({
      where: { date: Between(startMonth, endMonth) },
    });
    const totalOvertimeHours = await this.attendanceRepo
      .createQueryBuilder('a')
      .select('SUM(a.overtimeHours)', 'overtime')
      .getRawOne();

    // --- PAYROLL METRICS ---
    const totalPayrollRecords = await this.payrollRepo.count();
    const processedPayrolls = await this.payrollRepo.count({
      where: { status: StateStatus.APPROVED },
    });
    const pendingPayrolls = await this.payrollRepo.count({
      where: { status: StateStatus.PENDING },
    });

    const totalPayrollAmount =
      (
        await this.payrollRepo
          .createQueryBuilder('p')
          .select('SUM(p.netPay)', 'total')
          .getRawOne()
      )?.total || 0;

    const totalPaidPayroll =
      (
        await this.payrollRepo
          .createQueryBuilder('p')
          .select('SUM(p.netPay)', 'paid')
          .where('p.status = :status', { status: StateStatus.APPROVED })
          .getRawOne()
      )?.paid || 0;

    const pendingPayrollAmount =
      (
        await this.payrollRepo
          .createQueryBuilder('p')
          .select('SUM(p.netPay)', 'pending')
          .where('p.status = :status', { status: StateStatus.PENDING })
          .getRawOne()
      )?.pending || 0;

    return {
      period: {
        month: startMonth.toISOString().substring(0, 10),
        today: today.toISOString().substring(0, 10),
      },

      employees: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: inactiveEmployees,
        newThisMonth,
      },

      leaves: {
        total: totalLeaves,
        pending: pendingLeaves,
        approved: approvedLeaves,
        rejected: rejectedLeaves,
        createdThisMonth: currentMonthLeaves,
      },

      attendance: {
        totalToday: totalAttendanceToday,
        presentToday,
        absentToday,
        lateToday,
        totalMonth: totalAttendanceMonth,
        totalOvertimeHours: Number(totalOvertimeHours?.overtime || 0),
      },

      payroll: {
        totalRecords: totalPayrollRecords,
        processed: processedPayrolls,
        pending: pendingPayrolls,
        totalAmount: Number(totalPayrollAmount),
        paidAmount: Number(totalPaidPayroll),
        pendingAmount: Number(pendingPayrollAmount),
      },
    };
  }

  getAccountantAnalytics = async (authenticatedUser: User): Promise<any> => {
    const totalPayrollRecords = await this.payrollRepo.count();

    const processedPayrolls = await this.payrollRepo.count({
      where: { status: StateStatus.APPROVED },
    });

    const pendingPayrolls = await this.payrollRepo.count({
      where: { status: StateStatus.PENDING },
    });

    const totalPayrollAmount =
      (
        await this.payrollRepo
          .createQueryBuilder('p')
          .select('SUM(p.netPay)', 'sum')
          .getRawOne()
      )?.sum || 0;

    const paidPayrollAmount =
      (
        await this.payrollRepo
          .createQueryBuilder('p')
          .select('SUM(p.netPay)', 'sum')
          .where('p.status = :status', { status: StateStatus.APPROVED })
          .getRawOne()
      )?.sum || 0;

    const pendingPayrollAmount =
      (
        await this.payrollRepo
          .createQueryBuilder('p')
          .select('SUM(p.netPay)', 'sum')
          .where('p.status = :status', { status: StateStatus.PENDING })
          .getRawOne()
      )?.sum || 0;

    return {
      sales: await this.saleRepo.count(),
      debts: await this.debtRepo.count(),
      expenses: await this.expenseRepo.count(),
      payments: await this.paymentRepo.count(),
      upcomingSales: await this.saleRepo.count({
        where: { status: StateStatus.PENDING },
      }),
      pendingSales: await this.saleRepo.count({
        where: { status: StateStatus.PENDING },
      }),
      totalSaleUcomingAmount: await this.saleRepo.sum('totalPayableAmount', {
        status: StateStatus.PENDING,
      }),
      totalSalePaidAmount: await this.saleRepo.sum('paidAmount', {
        paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]),
      }),
      totalSalePayableAmount: await this.saleRepo.sum('totalPayableAmount', {
        paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]),
      }),
      totalSaleOutstandingAmount:
        (
          await this.saleRepo
            .createQueryBuilder('sale')
            .select(
              'SUM(sale.totalPayableAmount - sale.paidAmount)',
              'outstanding',
            )
            .where('sale.paymentStatus IN (:...statuses)', {
              statuses: [StateStatus.PAID, StateStatus.PAYING],
            })
            .getRawOne()
        )?.outstanding || 0,
      totalPayments: await this.paymentRepo.count(),
      totalSales: await this.saleRepo.count(),
      totalPaidSales: await this.saleRepo.count({
        where: { paymentStatus: In([StateStatus.PAID, StateStatus.PAYING]) },
      }),
      receivableDebt: await this.debtRepo.sum('amount', {
        type: DebtType.Receivable,
      }),
      totalPayableDebt: await this.debtRepo.sum('amount', {
        type: DebtType.Payable,
      }),
      totalDebt: await this.debtRepo.sum('amount'),

      pendingWorkBills: await this.billeRepo.count({
        where: { status: StateStatus.PENDING },
      }),
      approvedWorkBills: await this.billeRepo.count({
        where: { status: StateStatus.APPROVED },
      }),
      canceledWorkBills: await this.billeRepo.count({
        where: { status: StateStatus.DECLINED },
      }),
      settledWorkBills: await this.billeRepo.count({
        where: {
          status: StateStatus.SETTLED,
        },
      }),
      partiallySettledWorkBills: await this.billeRepo.count({
        where: {
          status: StateStatus.PARTIALLYSETTLED,
        },
      }),
      totalWorkBillAmountPending: await this.billeRepo.sum('amount', {
        status: StateStatus.PENDING,
      }),
      totalWorkBillAmountApproved: await this.billeRepo.sum('approvedAmount', {
        status: StateStatus.APPROVED,
      }),
      totalWorkBillAmountSettled: await this.billeRepo.sum('paidAmount', {
        status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
      }),
      totalIncidentAmountPending: await this.incidentRepo.sum('amount', {
        status: StateStatus.PENDING,
      }),
      totalIncidentAmountApproved: await this.incidentRepo.sum(
        'approvedAmount',
        { status: StateStatus.APPROVED },
      ),
      totalIncidentAmountSettled: await this.incidentRepo.sum('paidAmount', {
        status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
      }),
      totalFundRequestAmountPending: await this.fundRequestRepo.sum('amount', {
        status: StateStatus.PENDING,
      }),
      totalFundRequestAmountApproved: await this.fundRequestRepo.sum(
        'approvedAmount',
        { status: StateStatus.APPROVED },
      ),
      totalFundRequestAmountSettled: await this.fundRequestRepo.sum(
        'paidAmount',
        {
          status: In([StateStatus.SETTLED, StateStatus.PARTIALLYSETTLED]),
        },
      ),
      totalExpense: await this.expenseRepo.sum('amount'),
      totalPayrollRecords,
      processedPayrolls,
      pendingPayrolls,
      totalPayrollAmount: Number(totalPayrollAmount),
      paidPayrollAmount: Number(paidPayrollAmount),
      pendingPayrollAmount: Number(pendingPayrollAmount),
    };
  };
}
