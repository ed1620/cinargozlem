import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, RecordStatus } from '@prisma/client';
import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FinanceIntegrationService } from '../finance/finance-integration.service';
import { CreatePayrollDto, UpdatePayrollDto } from './dto/personnel.dto';

export const AUTO_EXPENSE_SALARY = 'AUTO_EXPENSE_FROM_SALARY';

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly integration: FinanceIntegrationService,
  ) {}

  private net(dto: CreatePayrollDto): number {
    if (dto.netSalary !== undefined) return dto.netSalary;
    return dto.grossSalary - (dto.deductions ?? 0) + (dto.additions ?? 0);
  }

  async listByPersonnel(personnelId: string) {
    const rows = await this.prisma.payroll.findMany({
      where: { personnelId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return rows.map((r) => this.map(r));
  }

  async create(dto: CreatePayrollDto) {
    const personnel = await this.prisma.personnel.findUnique({
      where: { id: dto.personnelId },
    });
    if (!personnel) throw new NotFoundException('Personel bulunamadı');
    // Pasif personele yeni maaş kaydı açılamaz.
    if (personnel.status !== RecordStatus.ACTIVE)
      throw new BadRequestException('Pasif personele maaş kaydı eklenemez');

    const dup = await this.prisma.payroll.findUnique({
      where: {
        personnelId_year_month: {
          personnelId: dto.personnelId,
          year: dto.year,
          month: dto.month,
        },
      },
    });
    if (dup)
      throw new ConflictException('Bu personel için bu aya ait kayıt zaten var');

    const created = await this.prisma.payroll.create({
      data: {
        personnelId: dto.personnelId,
        year: dto.year,
        month: dto.month,
        grossSalaryEnc: this.crypto.encrypt(dto.grossSalary)!,
        deductionsEnc: this.crypto.encrypt(dto.deductions ?? 0)!,
        additionsEnc: this.crypto.encrypt(dto.additions ?? 0)!,
        netSalaryEnc: this.crypto.encrypt(this.net(dto))!,
        deductionNote: dto.deductionNote,
        additionNote: dto.additionNote,
        paymentStatus: dto.paymentStatus ?? PaymentStatus.UNPAID,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
        note: dto.note,
      },
    });
    if (created.paymentStatus === PaymentStatus.PAID)
      await this.syncExpense(created.id);
    return this.get(created.id);
  }

  async update(id: string, dto: UpdatePayrollDto) {
    const current = await this.getRaw(id);
    const gross =
      dto.grossSalary ?? this.crypto.decryptNumber(current.grossSalaryEnc);
    const deductions =
      dto.deductions ?? this.crypto.decryptNumber(current.deductionsEnc);
    const additions =
      dto.additions ?? this.crypto.decryptNumber(current.additionsEnc);
    const net =
      dto.netSalary ?? gross - deductions + additions;

    await this.prisma.payroll.update({
      where: { id },
      data: {
        grossSalaryEnc: this.crypto.encrypt(gross)!,
        deductionsEnc: this.crypto.encrypt(deductions)!,
        additionsEnc: this.crypto.encrypt(additions)!,
        netSalaryEnc: this.crypto.encrypt(net)!,
        deductionNote: dto.deductionNote,
        additionNote: dto.additionNote,
        paymentStatus: dto.paymentStatus,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
        note: dto.note,
      },
    });
    await this.syncExpense(id);
    return this.get(id);
  }

  /** Maaşı ödendi işaretle → (bayrak açıksa) otomatik gider kaydı. */
  async markPaid(id: string, paymentDate?: string) {
    await this.getRaw(id);
    await this.prisma.payroll.update({
      where: { id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      },
    });
    await this.syncExpense(id);
    return this.get(id);
  }

  async remove(id: string) {
    await this.getRaw(id);
    await this.integration.removeExpenseFrom('PERSONNEL', id);
    await this.prisma.payroll.delete({ where: { id } });
    return { deleted: true };
  }

  /** Ödeme durumuna göre otomatik gider kaydını oluşturur/kaldırır. */
  private async syncExpense(payrollId: string) {
    const p = await this.prisma.payroll.findUnique({
      where: { id: payrollId },
      include: { personnel: { select: { firstName: true, lastName: true } } },
    });
    if (!p) return;
    const enabled = await this.integration.isEnabled(AUTO_EXPENSE_SALARY);
    if (p.paymentStatus === PaymentStatus.PAID && enabled) {
      const expenseId = await this.integration.createExpenseFrom({
        sourceModule: 'PERSONNEL',
        sourceEntityId: p.id,
        date: p.paymentDate ?? new Date(),
        amount: this.crypto.decryptNumber(p.netSalaryEnc),
        expenseType: 'Maaş',
        description: `${p.personnel.firstName} ${p.personnel.lastName} — ${p.month}/${p.year} maaş`,
        categoryName: 'Maaş',
      });
      if (expenseId && p.expenseId !== expenseId)
        await this.prisma.payroll.update({
          where: { id: p.id },
          data: { expenseId },
        });
    } else {
      await this.integration.removeExpenseFrom('PERSONNEL', p.id);
    }
  }

  private async getRaw(id: string) {
    const p = await this.prisma.payroll.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Maaş kaydı bulunamadı');
    return p;
  }
  async get(id: string) {
    return this.map(await this.getRaw(id));
  }
  private map(p: any) {
    return {
      id: p.id,
      personnelId: p.personnelId,
      year: p.year,
      month: p.month,
      grossSalary: this.crypto.decryptNumber(p.grossSalaryEnc),
      deductions: this.crypto.decryptNumber(p.deductionsEnc),
      additions: this.crypto.decryptNumber(p.additionsEnc),
      netSalary: this.crypto.decryptNumber(p.netSalaryEnc),
      deductionNote: p.deductionNote,
      additionNote: p.additionNote,
      paymentStatus: p.paymentStatus,
      paymentDate: p.paymentDate,
      note: p.note,
      expenseId: p.expenseId,
    };
  }
}
