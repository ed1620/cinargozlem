/**
 * Örnek veri yükleyici (demo). Tüm modüllere gerçekçi kayıtlar ekler.
 * Hassas alanlar (TC, maaş, tutar) CryptoService ile AYNI AES-256-GCM
 * şemasıyla şifrelenir. Idempotent: domain tablolarını temizleyip yeniden yükler.
 *
 * Çalıştır:  set -a; source .env; set +a; npx ts-node prisma/sample-data.ts
 */
import { PrismaClient } from '@prisma/client';
import {
  createCipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

const prisma = new PrismaClient();

// --- CryptoService ile birebir aynı şifreleme ---
const KEY = scryptSync(process.env.ENCRYPTION_KEY ?? '', 'kg-kyp-salt', 32);
function enc(v: string | number): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const e = Buffer.concat([cipher.update(String(v), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), e]).toString('base64');
}

const D = (s: string) => new Date(s);

async function main() {
  if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY yok (.env source edin)');

  // Temizle (kullanıcı/rol tablolarına dokunma)
  await prisma.$transaction([
    prisma.activityImage.deleteMany(),
    prisma.activityRecord.deleteMany(),
    prisma.student.deleteMany(),
    prisma.fuelRecord.deleteMany(),
    prisma.maintenanceRecord.deleteMany(),
    prisma.inspection.deleteMany(),
    prisma.insurancePolicy.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.income.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.financeCategory.deleteMany(),
    prisma.payroll.deleteMany(),
    prisma.leaveRecord.deleteMany(),
    prisma.leaveEntitlement.deleteMany(),
    prisma.personnel.deleteMany(),
    prisma.notification.deleteMany(),
  ]);

  // === KATEGORİLER ===
  const incCats = await Promise.all(
    ['Öğrenci Ödemesi', 'Devlet Desteği', 'Bağış'].map((name) =>
      prisma.financeCategory.create({ data: { name, type: 'INCOME' } }),
    ),
  );
  const expCats = await Promise.all(
    ['Kira', 'Fatura', 'Maaş', 'Akaryakıt', 'Bakım'].map((name) =>
      prisma.financeCategory.create({ data: { name, type: 'EXPENSE' } }),
    ),
  );

  // === PERSONEL ===
  const people = [
    { firstName: 'Ayşe', lastName: 'Yılmaz', title: 'Öğretmen', tc: '11111111110', gross: 42000 },
    { firstName: 'Mehmet', lastName: 'Demir', title: 'Uzman', tc: '22222222220', gross: 46000 },
    { firstName: 'Fatma', lastName: 'Kaya', title: 'Muhasebe', tc: '33333333330', gross: 40000 },
    { firstName: 'Ali', lastName: 'Şahin', title: 'Şoför', tc: '44444444440', gross: 38000 },
  ];
  const personnel = [];
  for (const p of people) {
    const rec = await prisma.personnel.create({
      data: {
        firstName: p.firstName,
        lastName: p.lastName,
        title: p.title,
        tcNoEnc: enc(p.tc),
        startDate: D('2023-09-01'),
        salaryType: 'MONTHLY',
        phone: '05xx xxx xx xx',
        leaveEntitlements: { create: { year: 2026, entitledDays: 20 } },
      },
    });
    personnel.push({ ...rec, gross: p.gross });
  }

  // İzin kayıtları
  await prisma.leaveRecord.create({
    data: {
      personnelId: personnel[0].id,
      type: 'ANNUAL',
      startDate: D('2026-07-28'),
      endDate: D('2026-08-01'),
      totalDays: 5,
      note: 'Yıllık izin',
    },
  });
  await prisma.leaveRecord.create({
    data: {
      personnelId: personnel[1].id,
      type: 'ANNUAL',
      startDate: D('2026-06-10'),
      endDate: D('2026-06-16'),
      totalDays: 7,
    },
  });

  // Bordro: 6/2026 ödenmiş, 7/2026 bir kısmı ödenmemiş (uyarı için)
  for (const p of personnel) {
    const net6 = Math.round(p.gross * 0.82);
    await prisma.payroll.create({
      data: {
        personnelId: p.id,
        year: 2026,
        month: 6,
        grossSalaryEnc: enc(p.gross),
        deductionsEnc: enc(Math.round(p.gross * 0.18)),
        additionsEnc: enc(0),
        netSalaryEnc: enc(net6),
        paymentStatus: 'PAID',
        paymentDate: D('2026-07-05'),
      },
    });
    await prisma.payroll.create({
      data: {
        personnelId: p.id,
        year: 2026,
        month: 7,
        grossSalaryEnc: enc(p.gross),
        deductionsEnc: enc(Math.round(p.gross * 0.18)),
        additionsEnc: enc(0),
        netSalaryEnc: enc(Math.round(p.gross * 0.82)),
        paymentStatus: p.title === 'Şoför' ? 'UNPAID' : 'PAID', // biri ödenmemiş
        paymentDate: p.title === 'Şoför' ? null : D('2026-08-05'),
      },
    });
  }

  // === FİNANS ===
  const incomes = [
    ['2026-07-02', incCats[0].id, 'Öğrenci aylık ödeme', 15000, 'TRANSFER'],
    ['2026-07-05', incCats[0].id, 'Öğrenci aylık ödeme', 15000, 'CASH'],
    ['2026-07-10', incCats[1].id, 'Devlet destek ödemesi', 120000, 'TRANSFER'],
    ['2026-07-18', incCats[2].id, 'Bağış', 8000, 'CASH'],
  ] as const;
  for (const [date, categoryId, description, amount, pm] of incomes) {
    await prisma.income.create({
      data: {
        date: D(date),
        incomeType: description,
        categoryId,
        description,
        amountEnc: enc(amount),
        paymentMethod: pm as any,
      },
    });
  }
  const expenses = [
    ['2026-07-01', expCats[0].id, 'Aylık kira', 35000, 'TRANSFER'],
    ['2026-07-03', expCats[1].id, 'Elektrik + su faturası', 9500, 'TRANSFER'],
    ['2026-07-06', expCats[2].id, 'Personel maaş ödemeleri', 138000, 'TRANSFER'],
    ['2026-07-15', expCats[1].id, 'İnternet + telefon', 2200, 'CREDIT_CARD'],
  ] as const;
  for (const [date, categoryId, description, amount, pm] of expenses) {
    await prisma.expense.create({
      data: {
        date: D(date),
        expenseType: description,
        categoryId,
        description,
        amountEnc: enc(amount),
        paymentMethod: pm as any,
      },
    });
  }

  // === ARAÇLAR (bugün: 2026-07-25) ===
  const v1 = await prisma.vehicle.create({
    data: {
      plate: '20 ABC 123',
      brand: 'Ford',
      model: 'Transit',
      modelYear: 2021,
      vehicleType: 'Minibüs',
      fuelType: 'DIESEL',
      responsiblePersonnelId: personnel[3].id,
    },
  });
  const v2 = await prisma.vehicle.create({
    data: {
      plate: '20 XYZ 456',
      brand: 'Fiat',
      model: 'Doblo',
      modelYear: 2019,
      vehicleType: 'Otomobil',
      fuelType: 'DIESEL',
    },
  });

  // Sigorta: v1 trafik 7 gün sonra (uyarı), kasko 40 gün; v2 trafik 3 gün önce doldu (uyarı+pasif)
  await prisma.insurancePolicy.createMany({
    data: [
      { vehicleId: v1.id, type: 'TRAFFIC', company: 'Anadolu Sigorta', policyNo: 'TRF-1001', startDate: D('2025-08-01'), endDate: D('2026-08-01'), amountEnc: enc(6500) },
      { vehicleId: v1.id, type: 'KASKO', company: 'Allianz', policyNo: 'KSK-2002', startDate: D('2025-09-03'), endDate: D('2026-09-03'), amountEnc: enc(18500) },
      { vehicleId: v2.id, type: 'TRAFFIC', company: 'Axa Sigorta', policyNo: 'TRF-1003', startDate: D('2025-07-22'), endDate: D('2026-07-22'), amountEnc: enc(5800) },
    ],
  });
  // Muayene: v1 15 gün sonra (uyarı), v2 uzak tarih
  await prisma.inspection.createMany({
    data: [
      { vehicleId: v1.id, inspectionDate: D('2024-08-09'), expiryDate: D('2026-08-09') },
      { vehicleId: v2.id, inspectionDate: D('2025-02-01'), expiryDate: D('2027-02-01') },
    ],
  });
  // Akaryakıt
  const fuel = [
    [v1.id, '2026-07-04', 55.4, 44.5, 128500],
    [v1.id, '2026-07-12', 60.0, 45.1, 131200],
    [v1.id, '2026-07-20', 48.2, 45.3, 130050],
    [v2.id, '2026-07-08', 40.0, 44.9, 96500],
    [v2.id, '2026-07-22', 38.5, 45.2, 97800],
  ] as const;
  for (const [vehicleId, date, liters, price, km] of fuel) {
    await prisma.fuelRecord.create({
      data: {
        vehicleId,
        date: D(date),
        fuelType: 'DIESEL',
        liters,
        pricePerLiter: price,
        totalAmount: Number((liters * price).toFixed(2)),
        odometer: km,
        paymentMethod: 'CREDIT_CARD',
      },
    });
  }
  // Bakım (KDV'siz otomatik)
  const maint = [
    [v1.id, '2026-06-15', 'Öz Ford Servis', 'Periyodik bakım + yağ', 6000, 20],
    [v2.id, '2026-07-02', 'Usta Oto', 'Fren balata değişimi', 3200, 20],
  ] as const;
  for (const [vehicleId, date, company, description, total, vat] of maint) {
    await prisma.maintenanceRecord.create({
      data: {
        vehicleId,
        date: D(date),
        company,
        description,
        totalAmount: total,
        vatRate: vat,
        netAmount: Number((total / (1 + vat / 100)).toFixed(2)),
        paymentMethod: 'CASH',
      },
    });
  }

  // === ÖĞRENCİLER ===
  const students = [
    { firstName: 'Zeynep', lastName: 'Aydın', tc: '55555555550', parent: 'Hasan Aydın', diag: 'Dil ve konuşma güçlüğü', active: true },
    { firstName: 'Emir', lastName: 'Yıldız', tc: '66666666660', parent: 'Elif Yıldız', diag: 'Otizm spektrum bozukluğu', active: true },
    { firstName: 'Elif', lastName: 'Çelik', tc: '77777777770', parent: 'Murat Çelik', diag: 'Özgül öğrenme güçlüğü', active: false },
  ];
  const created: { id: string; name: string }[] = [];
  for (const s of students) {
    const rec = await prisma.student.create({
      data: {
        firstName: s.firstName,
        lastName: s.lastName,
        tcNoEnc: enc(s.tc),
        parentName: s.parent,
        parentPhone: '05xx xxx xx xx',
        diagnosis: s.diag,
        registrationDate: D('2025-09-15'),
        status: s.active ? 'ACTIVE' : 'PASSIVE',
      },
    });
    created.push({ id: rec.id, name: `${s.firstName} ${s.lastName}` });
  }
  // Zeynep için 7/2026 aktiviteleri
  const acts = [
    ['2026-07-03', 'Nesne Tanıma Çalışması', 'Günlük eşyaların isimlendirilmesi', 'Kelime dağarcığını artırma', 'Aktif katılım gösterdi'],
    ['2026-07-11', 'Sesli Okuma', 'Kısa cümlelerin tekrarı', 'Telaffuz gelişimi', 'Belirgin ilerleme var'],
    ['2026-07-19', 'İnce Motor Becerileri', 'Boncuk dizme etkinliği', 'El-göz koordinasyonu', 'Desteğe ihtiyaç duyuyor'],
  ] as const;
  for (const [date, title, description, targetGains, evaluationNote] of acts) {
    await prisma.activityRecord.create({
      data: {
        studentId: created[0].id,
        date: D(date),
        title,
        description,
        targetGains,
        evaluationNote,
        year: 2026,
        month: 7,
      },
    });
  }

  console.log('Örnek veri yüklendi:');
  console.log(`  Personel: ${personnel.length}, Öğrenci: ${created.length}, Araç: 2`);
  console.log(`  Zeynep Aydın id (öğrenci raporu için): ${created[0].id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
