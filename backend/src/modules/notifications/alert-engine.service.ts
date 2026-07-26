import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  InsuranceType,
  ModuleCode,
  NotificationSeverity,
  NotificationType,
  PaymentStatus,
  RecordStatus,
} from '@prisma/client';
import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from './notifications.service';

/** Uyarı üretilecek gün eşikleri: bitişe 15 / 7 / 1 gün kala. */
const REMINDER_THRESHOLDS = [15, 7, 1];

/** İki tarih arasındaki tam gün farkı (gün başlangıcına normalize). */
function daysUntil(target: Date, from = new Date()): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Merkezi Uyarı Motoru.
 * Her gün 08:00'de tüm izlenen olayları tarar; uygulama açılışında da bir kez
 * çalışır. Tüm uyarılar dedupeKey ile üretilir → tekrar oluşmaz.
 */
@Injectable()
export class AlertEngineService {
  private readonly logger = new Logger(AlertEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly crypto: CryptoService,
  ) {}

  /** Günlük tarama — yedeklemeden (09:00) önce 08:00'de. */
  @Cron(process.env.ALERT_CRON ?? '0 8 * * *', { name: 'alert-engine' })
  async runDailyScan(): Promise<void> {
    this.logger.log('Uyarı motoru taraması başladı');
    await this.runAllChecks();
    this.logger.log('Uyarı motoru taraması tamamlandı');
  }

  /** Manuel tetikleme (admin) ve cron aynı gövdeyi kullanır. */
  async runAllChecks(): Promise<void> {
    await Promise.all([
      this.checkInsurances(),
      this.checkInspections(),
      this.checkLeaves(),
      this.checkUnpaidSalaries(),
      this.checkNegativeBalance(),
    ]);
  }

  // --- Sigorta & Kasko ---------------------------------------------------
  private async checkInsurances(): Promise<void> {
    const policies = await this.prisma.insurancePolicy.findMany({
      where: { status: RecordStatus.ACTIVE },
      include: { vehicle: { select: { plate: true } } },
    });

    for (const p of policies) {
      const label = p.type === InsuranceType.KASKO ? 'Kasko' : 'Trafik sigortası';
      const type =
        p.type === InsuranceType.KASKO
          ? NotificationType.KASKO_EXPIRY
          : NotificationType.INSURANCE_EXPIRY;
      const d = daysUntil(p.endDate);

      if (d < 0) {
        // Süresi geçmiş → pasife al + uyarı
        await this.prisma.insurancePolicy.update({
          where: { id: p.id },
          data: { status: RecordStatus.PASSIVE },
        });
        await this.notifications.emit({
          type: NotificationType.EXPIRED_RECORD,
          severity: NotificationSeverity.CRITICAL,
          title: `${label} süresi doldu`,
          message: `${p.vehicle.plate} plakalı aracın ${label.toLowerCase()} süresi ${p.endDate.toLocaleDateString('tr-TR')} tarihinde doldu.`,
          module: ModuleCode.VEHICLES,
          resource: 'InsurancePolicy',
          resourceId: p.id,
          dedupeKey: `INS:${p.id}:EXPIRED`,
        });
        continue;
      }

      if (REMINDER_THRESHOLDS.includes(d)) {
        await this.notifications.emit({
          type,
          severity: d <= 1 ? NotificationSeverity.CRITICAL : NotificationSeverity.WARNING,
          title: `${label} bitişine ${d} gün`,
          message: `${p.vehicle.plate} plakalı aracın ${label.toLowerCase()} ${p.endDate.toLocaleDateString('tr-TR')} tarihinde bitiyor (${d} gün kaldı).`,
          module: ModuleCode.VEHICLES,
          resource: 'InsurancePolicy',
          resourceId: p.id,
          dedupeKey: `INS:${p.id}:${d}D`,
        });
      }
    }
  }

  // --- Araç Muayene ------------------------------------------------------
  private async checkInspections(): Promise<void> {
    const inspections = await this.prisma.inspection.findMany({
      where: { status: RecordStatus.ACTIVE },
      include: { vehicle: { select: { plate: true } } },
    });

    for (const ins of inspections) {
      const d = daysUntil(ins.expiryDate);

      if (d < 0) {
        await this.prisma.inspection.update({
          where: { id: ins.id },
          data: { status: RecordStatus.PASSIVE },
        });
        await this.notifications.emit({
          type: NotificationType.EXPIRED_RECORD,
          severity: NotificationSeverity.CRITICAL,
          title: 'Araç muayenesi süresi doldu',
          message: `${ins.vehicle.plate} plakalı aracın muayene süresi ${ins.expiryDate.toLocaleDateString('tr-TR')} tarihinde doldu.`,
          module: ModuleCode.VEHICLES,
          resource: 'Inspection',
          resourceId: ins.id,
          dedupeKey: `INSP:${ins.id}:EXPIRED`,
        });
        continue;
      }

      if (REMINDER_THRESHOLDS.includes(d)) {
        await this.notifications.emit({
          type: NotificationType.INSPECTION_EXPIRY,
          severity: d <= 1 ? NotificationSeverity.CRITICAL : NotificationSeverity.WARNING,
          title: `Araç muayenesine ${d} gün`,
          message: `${ins.vehicle.plate} plakalı aracın muayenesi ${ins.expiryDate.toLocaleDateString('tr-TR')} tarihinde bitiyor (${d} gün kaldı).`,
          module: ModuleCode.VEHICLES,
          resource: 'Inspection',
          resourceId: ins.id,
          dedupeKey: `INSP:${ins.id}:${d}D`,
        });
      }
    }
  }

  // --- Personel İzin bitişi & çakışması ----------------------------------
  private async checkLeaves(): Promise<void> {
    const leaves = await this.prisma.leaveRecord.findMany({
      where: { status: RecordStatus.ACTIVE },
      include: { personnel: { select: { firstName: true, lastName: true } } },
    });

    // Yaklaşan izin bitişleri (dönüş tarihi 3 gün içinde)
    for (const lv of leaves) {
      const d = daysUntil(lv.endDate);
      if (d >= 0 && d <= 3) {
        const name = `${lv.personnel.firstName} ${lv.personnel.lastName}`;
        await this.notifications.emit({
          type: NotificationType.LEAVE_EXPIRY,
          severity: NotificationSeverity.INFO,
          title: 'Personel izni bitiyor',
          message: `${name} adlı personelin izni ${lv.endDate.toLocaleDateString('tr-TR')} tarihinde bitiyor (${d} gün kaldı).`,
          module: ModuleCode.PERSONNEL,
          resource: 'LeaveRecord',
          resourceId: lv.id,
          dedupeKey: `LEAVE:${lv.id}:END`,
        });
      }
    }

    // Çakışan izinler (aynı personel, tarih aralıkları kesişiyor)
    const byPersonnel = new Map<string, typeof leaves>();
    for (const lv of leaves) {
      const arr = byPersonnel.get(lv.personnelId) ?? [];
      arr.push(lv);
      byPersonnel.set(lv.personnelId, arr);
    }
    for (const [, group] of byPersonnel) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];
          const overlap = a.startDate <= b.endDate && b.startDate <= a.endDate;
          if (overlap) {
            const name = `${a.personnel.firstName} ${a.personnel.lastName}`;
            const pair = [a.id, b.id].sort().join('_');
            await this.notifications.emit({
              type: NotificationType.LEAVE_OVERLAP,
              severity: NotificationSeverity.WARNING,
              title: 'Çakışan izin kaydı',
              message: `${name} adlı personelin çakışan iki izin kaydı var.`,
              module: ModuleCode.PERSONNEL,
              resource: 'LeaveRecord',
              resourceId: a.id,
              dedupeKey: `LEAVE:OVERLAP:${pair}`,
            });
          }
        }
      }
    }
  }

  // --- Ödenmemiş maaşlar -------------------------------------------------
  private async checkUnpaidSalaries(): Promise<void> {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;

    const unpaid = await this.prisma.payroll.findMany({
      where: {
        paymentStatus: PaymentStatus.UNPAID,
        OR: [{ year: { lt: y } }, { year: y, month: { lte: m } }],
      },
      include: { personnel: { select: { firstName: true, lastName: true } } },
    });

    for (const p of unpaid) {
      const name = `${p.personnel.firstName} ${p.personnel.lastName}`;
      await this.notifications.emit({
        type: NotificationType.UNPAID_SALARY,
        severity: NotificationSeverity.WARNING,
        title: 'Ödenmemiş maaş',
        message: `${name} — ${p.month}/${p.year} dönemi maaşı henüz ödenmedi.`,
        module: ModuleCode.PERSONNEL,
        resource: 'Payroll',
        resourceId: p.id,
        dedupeKey: `SALARY:UNPAID:${p.id}`,
      });
    }
  }

  // --- Negatif bakiye ----------------------------------------------------
  private async checkNegativeBalance(): Promise<void> {
    const [incomes, expenses] = await Promise.all([
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
    const balance = totalIncome - totalExpense;

    if (balance < 0) {
      const today = new Date().toISOString().slice(0, 10);
      await this.notifications.emit({
        type: NotificationType.NEGATIVE_BALANCE,
        severity: NotificationSeverity.CRITICAL,
        title: 'Negatif bakiye uyarısı',
        message: `Güncel kasa bakiyesi negatif: ${balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}.`,
        module: ModuleCode.FINANCE,
        resource: 'Balance',
        dedupeKey: `BALANCE:NEG:${today}`,
      });
    }
  }
}
