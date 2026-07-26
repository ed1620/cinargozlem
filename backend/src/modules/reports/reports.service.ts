import { Injectable, NotFoundException } from '@nestjs/common';
import { RecordStatus } from '@prisma/client';
import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PdfService } from './pdf.service';

const money = (n: number) =>
  // ₺ (U+20BA) bazı sistem fontlarında olmadığından PDF'te "TL" son eki kullanılır.
  n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' TL';
const date = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString('tr-TR') : '-';

/**
 * Modüllerden gelen veriyi merkezi PdfService ile rapora dönüştürür.
 * Filtrelenebilir; hassas alanlar (maaş, tutar) CryptoService ile çözülür.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly pdf: PdfService,
  ) {}

  private dateRange(year?: number, month?: number) {
    if (!year) return undefined;
    const start = new Date(year, month ? month - 1 : 0, 1);
    const end = month
      ? new Date(year, month, 0, 23, 59, 59)
      : new Date(year, 11, 31, 23, 59, 59);
    return { gte: start, lte: end };
  }

  // --- PERSONEL ----------------------------------------------------------
  async personnelList(status?: RecordStatus): Promise<Buffer> {
    const rows = await this.prisma.personnel.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return this.pdf.buildReport({
      title: 'Personel Listesi',
      filters: { Durum: status ?? 'Tümü', 'Kayıt sayısı': rows.length },
      columns: [
        { header: 'Ad Soyad', key: 'name' },
        { header: 'Görev', key: 'title', width: 120 },
        { header: 'İşe Başlama', key: 'start', width: 90, align: 'center' },
        { header: 'Durum', key: 'status', width: 70, align: 'center' },
      ],
      rows: rows.map((p) => ({
        name: `${p.firstName} ${p.lastName}`,
        title: p.title,
        start: date(p.startDate),
        status: p.status === RecordStatus.ACTIVE ? 'Aktif' : 'Pasif',
      })),
    });
  }

  async payrollByPeriod(year: number, month: number): Promise<Buffer> {
    const rows = await this.prisma.payroll.findMany({
      where: { year, month },
      include: { personnel: { select: { firstName: true, lastName: true } } },
      orderBy: { personnel: { lastName: 'asc' } },
    });
    let totalNet = 0;
    const mapped = rows.map((r) => {
      const net = this.crypto.decryptNumber(r.netSalaryEnc);
      totalNet += net;
      return {
        name: `${r.personnel.firstName} ${r.personnel.lastName}`,
        gross: money(this.crypto.decryptNumber(r.grossSalaryEnc)),
        net: money(net),
        status: r.paymentStatus === 'PAID' ? 'Ödendi' : 'Ödenmedi',
        paidAt: date(r.paymentDate),
      };
    });
    return this.pdf.buildReport({
      title: 'Aylık Maaş Bordrosu',
      subtitle: `${month}/${year} dönemi`,
      filters: { 'Personel sayısı': rows.length },
      columns: [
        { header: 'Ad Soyad', key: 'name' },
        { header: 'Brüt', key: 'gross', width: 90, align: 'right' },
        { header: 'Net', key: 'net', width: 90, align: 'right' },
        { header: 'Durum', key: 'status', width: 70, align: 'center' },
        { header: 'Ödeme Tarihi', key: 'paidAt', width: 90, align: 'center' },
      ],
      rows: mapped,
      totals: { net: money(totalNet) },
    });
  }

  async leaveUsage(year: number): Promise<Buffer> {
    const personnel = await this.prisma.personnel.findMany({
      where: { status: RecordStatus.ACTIVE },
      include: {
        leaveEntitlements: { where: { year } },
        leaveRecords: {
          where: {
            status: RecordStatus.ACTIVE,
            startDate: { gte: new Date(year, 0, 1) },
            endDate: { lte: new Date(year, 11, 31, 23, 59, 59) },
          },
        },
      },
      orderBy: { lastName: 'asc' },
    });
    return this.pdf.buildReport({
      title: 'Yıllık İzin Kullanımı',
      subtitle: `${year} yılı`,
      columns: [
        { header: 'Ad Soyad', key: 'name' },
        { header: 'Hak (gün)', key: 'entitled', width: 80, align: 'center' },
        { header: 'Kullanılan', key: 'used', width: 80, align: 'center' },
        { header: 'Kalan', key: 'remaining', width: 80, align: 'center' },
      ],
      rows: personnel.map((p) => {
        const entitled = p.leaveEntitlements[0]?.entitledDays ?? 0;
        const used = p.leaveRecords.reduce((s, l) => s + l.totalDays, 0);
        return {
          name: `${p.firstName} ${p.lastName}`,
          entitled,
          used,
          remaining: entitled - used,
        };
      }),
    });
  }

  // --- FİNANS ------------------------------------------------------------
  async financeSummary(year: number, month?: number): Promise<Buffer> {
    const start = new Date(year, month ? month - 1 : 0, 1);
    const end = month
      ? new Date(year, month, 0, 23, 59, 59)
      : new Date(year, 11, 31, 23, 59, 59);
    const where = {
      status: RecordStatus.ACTIVE,
      date: { gte: start, lte: end },
    };
    const [incomes, expenses] = await Promise.all([
      this.prisma.income.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'asc' },
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

    const rows = [
      ...incomes.map((i) => ({
        date: date(i.date),
        type: 'Gelir',
        category: i.category?.name ?? '-',
        desc: i.description ?? i.incomeType,
        amount: money(this.crypto.decryptNumber(i.amountEnc)),
      })),
      ...expenses.map((e) => ({
        date: date(e.date),
        type: 'Gider',
        category: e.category?.name ?? '-',
        desc: e.description ?? e.expenseType,
        amount: '-' + money(this.crypto.decryptNumber(e.amountEnc)),
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    return this.pdf.buildReport({
      title: 'Gelir - Gider Raporu',
      subtitle: month ? `${month}/${year} dönemi` : `${year} yılı`,
      filters: {
        'Toplam Gelir': money(totalIncome),
        'Toplam Gider': money(totalExpense),
        'Net Bakiye': money(totalIncome - totalExpense),
      },
      columns: [
        { header: 'Tarih', key: 'date', width: 70, align: 'center' },
        { header: 'Tür', key: 'type', width: 50, align: 'center' },
        { header: 'Kategori', key: 'category', width: 100 },
        { header: 'Açıklama', key: 'desc' },
        { header: 'Tutar', key: 'amount', width: 90, align: 'right' },
      ],
      rows,
      totals: { amount: money(totalIncome - totalExpense) },
    });
  }

  // --- ARAÇ --------------------------------------------------------------
  async vehicleUpcoming(): Promise<Buffer> {
    const [insurances, inspections] = await Promise.all([
      this.prisma.insurancePolicy.findMany({
        include: { vehicle: { select: { plate: true } } },
        orderBy: { endDate: 'asc' },
      }),
      this.prisma.inspection.findMany({
        include: { vehicle: { select: { plate: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
    ]);
    const today = new Date();
    const days = (d: Date) =>
      Math.round((new Date(d).getTime() - today.getTime()) / 86_400_000);

    const rows = [
      ...insurances.map((p) => ({
        plate: p.vehicle.plate,
        kind: p.type === 'KASKO' ? 'Kasko' : 'Trafik Sig.',
        end: date(p.endDate),
        left: days(p.endDate) < 0 ? 'SÜRESİ GEÇTİ' : `${days(p.endDate)} gün`,
      })),
      ...inspections.map((i) => ({
        plate: i.vehicle.plate,
        kind: 'Muayene',
        end: date(i.expiryDate),
        left: days(i.expiryDate) < 0 ? 'SÜRESİ GEÇTİ' : `${days(i.expiryDate)} gün`,
      })),
    ];
    return this.pdf.buildReport({
      title: 'Yaklaşan / Süresi Geçen İşlemler',
      columns: [
        { header: 'Plaka', key: 'plate', width: 90 },
        { header: 'İşlem', key: 'kind', width: 100, align: 'center' },
        { header: 'Bitiş', key: 'end', width: 90, align: 'center' },
        { header: 'Kalan', key: 'left', align: 'center' },
      ],
      rows,
    });
  }

  async fuelReport(
    vehicleId?: string,
    year?: number,
    month?: number,
  ): Promise<Buffer> {
    const where: Record<string, unknown> = { status: RecordStatus.ACTIVE };
    if (vehicleId) where.vehicleId = vehicleId;
    if (year) {
      const start = new Date(year, month ? month - 1 : 0, 1);
      const end = month
        ? new Date(year, month, 0, 23, 59, 59)
        : new Date(year, 11, 31, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }
    const records = await this.prisma.fuelRecord.findMany({
      where,
      include: { vehicle: { select: { plate: true } } },
      orderBy: { date: 'asc' },
    });
    let totalAmount = 0;
    let totalLiters = 0;
    const rows = records.map((r) => {
      totalAmount += Number(r.totalAmount);
      totalLiters += Number(r.liters);
      return {
        date: date(r.date),
        plate: r.vehicle.plate,
        fuel: r.fuelType,
        liters: Number(r.liters).toFixed(2),
        price: money(Number(r.pricePerLiter)),
        total: money(Number(r.totalAmount)),
        km: r.odometer ?? '-',
      };
    });
    return this.pdf.buildReport({
      title: 'Akaryakıt Tüketim Raporu',
      subtitle: year ? (month ? `${month}/${year}` : `${year} yılı`) : 'Tüm zamanlar',
      filters: {
        'Toplam litre': totalLiters.toFixed(2),
        'Toplam tutar': money(totalAmount),
      },
      columns: [
        { header: 'Tarih', key: 'date', width: 70, align: 'center' },
        { header: 'Plaka', key: 'plate', width: 80 },
        { header: 'Yakıt', key: 'fuel', width: 60, align: 'center' },
        { header: 'Litre', key: 'liters', width: 55, align: 'right' },
        { header: 'Birim', key: 'price', width: 75, align: 'right' },
        { header: 'Tutar', key: 'total', width: 80, align: 'right' },
        { header: 'KM', key: 'km', width: 60, align: 'right' },
      ],
      rows,
      totals: { total: money(totalAmount) },
    });
  }

  // --- ÖĞRENCİ -----------------------------------------------------------
  async studentMonthly(
    studentId: string,
    year: number,
    month: number,
  ): Promise<Buffer> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Öğrenci bulunamadı');

    const activities = await this.prisma.activityRecord.findMany({
      where: { studentId, year, month, status: RecordStatus.ACTIVE },
      include: { _count: { select: { images: true } } },
      orderBy: { date: 'asc' },
    });

    return this.pdf.buildReport({
      title: 'Aylık Gelişim Raporu',
      subtitle: `${student.firstName} ${student.lastName} — ${month}/${year}`,
      filters: { 'Aktivite sayısı': activities.length },
      columns: [
        { header: 'Tarih', key: 'date', width: 70, align: 'center' },
        { header: 'Aktivite', key: 'title', width: 120 },
        { header: 'Kazanım / Değerlendirme', key: 'note' },
        { header: 'Görsel', key: 'images', width: 55, align: 'center' },
      ],
      rows: activities.map((a) => ({
        date: date(a.date),
        title: a.title,
        note: [a.targetGains, a.evaluationNote].filter(Boolean).join(' — '),
        images: a._count.images,
      })),
    });
  }

  async studentAnnual(studentId: string, year: number): Promise<Buffer> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Öğrenci bulunamadı');
    const activities = await this.prisma.activityRecord.findMany({
      where: { studentId, year, status: RecordStatus.ACTIVE },
      include: { _count: { select: { images: true } } },
      orderBy: { date: 'asc' },
    });
    const byMonth = new Map<number, typeof activities>();
    for (const a of activities) {
      const arr = byMonth.get(a.month) ?? [];
      arr.push(a);
      byMonth.set(a.month, arr);
    }
    const rows = [...byMonth.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([m, list]) => ({
        month: AYLAR[m],
        count: list.length,
        titles: list.map((a) => a.title).join(', '),
        images: list.reduce((s, a) => s + a._count.images, 0),
      }));
    return this.pdf.buildReport({
      title: 'Yıllık Gelişim Raporu',
      subtitle: `${student.firstName} ${student.lastName} — ${year}`,
      filters: { 'Toplam aktivite': activities.length },
      columns: [
        { header: 'Ay', key: 'month', width: 100 },
        { header: 'Aktivite Sayısı', key: 'count', width: 110, align: 'center' },
        { header: 'Aktiviteler', key: 'titles' },
        { header: 'Görsel', key: 'images', width: 60, align: 'center' },
      ],
      rows,
    });
  }

  // --- FİNANS: kategori & ödeme yöntemi dağılımı ---
  async financeByCategory(year: number, month?: number): Promise<Buffer> {
    const range = this.dateRange(year, month);
    const [incomes, expenses] = await Promise.all([
      this.prisma.income.findMany({
        where: { status: RecordStatus.ACTIVE, date: range },
        include: { category: true },
      }),
      this.prisma.expense.findMany({
        where: { status: RecordStatus.ACTIVE, date: range },
        include: { category: true },
      }),
    ]);
    const agg = new Map<string, { type: string; cat: string; total: number }>();
    const add = (type: string, cat: string, amount: number) => {
      const k = `${type}|${cat}`;
      const cur = agg.get(k) ?? { type, cat, total: 0 };
      cur.total += amount;
      agg.set(k, cur);
    };
    for (const i of incomes)
      add('Gelir', i.category?.name ?? 'Kategorisiz', this.crypto.decryptNumber(i.amountEnc));
    for (const e of expenses)
      add('Gider', e.category?.name ?? 'Kategorisiz', this.crypto.decryptNumber(e.amountEnc));
    const rows = [...agg.values()]
      .sort((a, b) => a.type.localeCompare(b.type) || b.total - a.total)
      .map((r) => ({ type: r.type, cat: r.cat, total: money(r.total) }));
    return this.pdf.buildReport({
      title: 'Kategori Bazlı Finans Raporu',
      subtitle: month ? `${month}/${year}` : `${year} yılı`,
      columns: [
        { header: 'Tür', key: 'type', width: 80 },
        { header: 'Kategori', key: 'cat' },
        { header: 'Toplam', key: 'total', width: 120, align: 'right' },
      ],
      rows,
    });
  }

  async financeByPaymentMethod(year: number): Promise<Buffer> {
    const range = this.dateRange(year);
    const [incomes, expenses] = await Promise.all([
      this.prisma.income.findMany({
        where: { status: RecordStatus.ACTIVE, date: range },
        select: { paymentMethod: true, amountEnc: true },
      }),
      this.prisma.expense.findMany({
        where: { status: RecordStatus.ACTIVE, date: range },
        select: { paymentMethod: true, amountEnc: true },
      }),
    ]);
    const PM: Record<string, string> = {
      CASH: 'Nakit', TRANSFER: 'Havale', EFT: 'EFT', CREDIT_CARD: 'Kredi Kartı', OTHER: 'Diğer',
    };
    const agg = new Map<string, { pm: string; income: number; expense: number }>();
    const row = (pm: string) =>
      agg.get(pm) ?? { pm, income: 0, expense: 0 };
    for (const i of incomes) {
      const r = row(i.paymentMethod);
      r.income += this.crypto.decryptNumber(i.amountEnc);
      agg.set(i.paymentMethod, r);
    }
    for (const e of expenses) {
      const r = row(e.paymentMethod);
      r.expense += this.crypto.decryptNumber(e.amountEnc);
      agg.set(e.paymentMethod, r);
    }
    return this.pdf.buildReport({
      title: 'Ödeme Yöntemine Göre Finans',
      subtitle: `${year} yılı`,
      columns: [
        { header: 'Yöntem', key: 'pm' },
        { header: 'Gelir', key: 'income', width: 120, align: 'right' },
        { header: 'Gider', key: 'expense', width: 120, align: 'right' },
      ],
      rows: [...agg.values()].map((r) => ({
        pm: PM[r.pm] ?? r.pm,
        income: money(r.income),
        expense: money(r.expense),
      })),
    });
  }

  // --- ARAÇ: geçmiş & litre/km tüketim ---
  async vehicleHistory(vehicleId: string): Promise<Buffer> {
    const v = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { insurances: true, inspections: true, fuelRecords: true, maintenances: true },
    });
    if (!v) throw new NotFoundException('Araç bulunamadı');
    const rows: Array<{ date: string; type: string; detail: string; amount: string }> = [];
    for (const i of v.insurances)
      rows.push({ date: date(i.startDate), type: i.type === 'KASKO' ? 'Kasko' : 'Trafik Sig.', detail: `${i.company} (bitiş ${date(i.endDate)})`, amount: i.amountEnc ? money(this.crypto.decryptNumber(i.amountEnc)) : '-' });
    for (const i of v.inspections)
      rows.push({ date: date(i.inspectionDate), type: 'Muayene', detail: `Bitiş ${date(i.expiryDate)}`, amount: '-' });
    for (const f of v.fuelRecords)
      rows.push({ date: date(f.date), type: 'Akaryakıt', detail: `${Number(f.liters)} L`, amount: money(Number(f.totalAmount)) });
    for (const m of v.maintenances)
      rows.push({ date: date(m.date), type: 'Bakım', detail: m.company ?? m.description ?? '', amount: money(Number(m.totalAmount)) });
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return this.pdf.buildReport({
      title: 'Araç Geçmiş Raporu',
      subtitle: `${v.plate} — ${v.brand} ${v.model}`,
      columns: [
        { header: 'Tarih', key: 'date', width: 80, align: 'center' },
        { header: 'İşlem', key: 'type', width: 90 },
        { header: 'Detay', key: 'detail' },
        { header: 'Tutar', key: 'amount', width: 110, align: 'right' },
      ],
      rows,
    });
  }

  async fuelConsumption(vehicleId: string): Promise<Buffer> {
    const v = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!v) throw new NotFoundException('Araç bulunamadı');
    const records = await this.prisma.fuelRecord.findMany({
      where: { vehicleId, status: RecordStatus.ACTIVE },
      orderBy: { date: 'asc' },
    });
    let prevKm: number | null = null;
    const rows = records.map((r) => {
      const km = r.odometer ?? null;
      const dist = km != null && prevKm != null ? km - prevKm : null;
      const l100 = dist && dist > 0 ? ((Number(r.liters) / dist) * 100).toFixed(2) : '-';
      prevKm = km ?? prevKm;
      return {
        date: date(r.date),
        km: km ?? '-',
        liters: Number(r.liters).toFixed(2),
        dist: dist ?? '-',
        l100,
      };
    });
    return this.pdf.buildReport({
      title: 'Litre / KM Tüketim Raporu',
      subtitle: `${v.plate}`,
      filters: { Not: 'Tüketim, ardışık km bilgisi olan kayıtlarda hesaplanır' },
      columns: [
        { header: 'Tarih', key: 'date', width: 80, align: 'center' },
        { header: 'KM', key: 'km', width: 90, align: 'right' },
        { header: 'Litre', key: 'liters', width: 80, align: 'right' },
        { header: 'Mesafe', key: 'dist', width: 80, align: 'right' },
        { header: 'L/100km', key: 'l100', width: 90, align: 'right' },
      ],
      rows,
    });
  }

  // --- PERSONEL: yıllık maaş dökümü ---
  async personnelAnnualSalary(personnelId: string, year: number): Promise<Buffer> {
    const p = await this.prisma.personnel.findUnique({ where: { id: personnelId } });
    if (!p) throw new NotFoundException('Personel bulunamadı');
    const payrolls = await this.prisma.payroll.findMany({
      where: { personnelId, year },
      orderBy: { month: 'asc' },
    });
    let totalNet = 0;
    const rows = payrolls.map((r) => {
      const net = this.crypto.decryptNumber(r.netSalaryEnc);
      totalNet += net;
      return {
        month: AYLAR[r.month],
        gross: money(this.crypto.decryptNumber(r.grossSalaryEnc)),
        net: money(net),
        status: r.paymentStatus === 'PAID' ? 'Ödendi' : 'Ödenmedi',
      };
    });
    return this.pdf.buildReport({
      title: 'Personel Yıllık Maaş Dökümü',
      subtitle: `${p.firstName} ${p.lastName} — ${year}`,
      columns: [
        { header: 'Ay', key: 'month', width: 100 },
        { header: 'Brüt', key: 'gross', width: 120, align: 'right' },
        { header: 'Net', key: 'net', width: 120, align: 'right' },
        { header: 'Durum', key: 'status', width: 90, align: 'center' },
      ],
      rows,
      totals: { net: money(totalNet) },
    });
  }
}

const AYLAR = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
