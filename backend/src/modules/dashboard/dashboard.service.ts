import { Injectable } from '@nestjs/common';
import { PaymentStatus, RecordStatus } from '@prisma/client';
import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Role/yetkiye göre dinamik dashboard için özet metrikler. */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async summary() {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86_400_000);

    const [
      studentsActive,
      studentsPassive,
      personnelActive,
      unreadNotifications,
      upcomingInsurance,
      upcomingInspection,
      unpaidSalaries,
      incomes,
      expenses,
    ] = await Promise.all([
      this.prisma.student.count({ where: { status: RecordStatus.ACTIVE } }),
      this.prisma.student.count({ where: { status: RecordStatus.PASSIVE } }),
      this.prisma.personnel.count({ where: { status: RecordStatus.ACTIVE } }),
      this.prisma.notification.count({ where: { isRead: false } }),
      this.prisma.insurancePolicy.count({
        where: {
          status: RecordStatus.ACTIVE,
          endDate: { gte: now, lte: in30 },
        },
      }),
      this.prisma.inspection.count({
        where: {
          status: RecordStatus.ACTIVE,
          expiryDate: { gte: now, lte: in30 },
        },
      }),
      this.prisma.payroll.count({
        where: { paymentStatus: PaymentStatus.UNPAID },
      }),
      this.prisma.income.findMany({
        where: { status: RecordStatus.ACTIVE },
        select: { amountEnc: true },
      }),
      this.prisma.expense.findMany({
        where: { status: RecordStatus.ACTIVE },
        select: { amountEnc: true },
      }),
    ]);

    const totalIncome = incomes.reduce(
      (s, i) => s + this.crypto.decryptNumber(i.amountEnc),
      0,
    );
    const totalExpense = expenses.reduce(
      (s, e) => s + this.crypto.decryptNumber(e.amountEnc),
      0,
    );

    return {
      students: { active: studentsActive, passive: studentsPassive },
      personnel: { active: personnelActive },
      finance: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      },
      alerts: {
        unreadNotifications,
        upcomingInsurance,
        upcomingInspection,
        unpaidSalaries,
      },
    };
  }
}
