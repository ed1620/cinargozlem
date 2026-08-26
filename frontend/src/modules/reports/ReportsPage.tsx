import { useState } from 'react';
import { Can } from '../../components/Can';
import { Button, Card, inputCls, PageHeader } from '../../components/ui';
import { downloadReport } from '../../services/domain';
import { ModuleCode, PermissionAction } from '../../types';

const now = new Date();

interface ReportDef {
  module: ModuleCode;
  title: string;
  path: (y: number, m: number) => string;
  file: string;
  needsMonth?: boolean;
}

const REPORTS: ReportDef[] = [
  { module: 'PERSONNEL', title: 'Personel Listesi', path: () => '/reports/personnel', file: 'personel.pdf' },
  { module: 'PERSONNEL', title: 'Aylık Maaş Bordrosu', path: (y, m) => `/reports/payroll?year=${y}&month=${m}`, file: 'bordro.pdf', needsMonth: true },
  { module: 'PERSONNEL', title: 'Yıllık İzin Kullanımı', path: (y) => `/reports/leaves?year=${y}`, file: 'izin.pdf' },
  { module: 'FINANCE', title: 'Gelir - Gider Raporu', path: (y) => `/reports/finance?year=${y}`, file: 'gelir-gider.pdf' },
  { module: 'FINANCE', title: 'Kategori Bazlı Finans', path: (y) => `/reports/finance/by-category?year=${y}`, file: 'finans-kategori.pdf' },
  { module: 'FINANCE', title: 'Ödeme Yöntemi Dağılımı', path: (y) => `/reports/finance/by-payment?year=${y}`, file: 'finans-odeme.pdf' },
  { module: 'VEHICLES', title: 'Yaklaşan / Süresi Geçen İşlemler', path: () => '/reports/vehicles/upcoming', file: 'yaklasan.pdf' },
  { module: 'VEHICLES', title: 'Akaryakıt Tüketim Raporu', path: (y) => `/reports/fuel?year=${y}`, file: 'akaryakit.pdf' },
];

export function ReportsPage() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  return (
    <div>
      <PageHeader
        title="Raporlar"
        subtitle="Filtre seçip PDF olarak indirin (kurum başlıklı)"
        actions={
          <div className="flex gap-2">
            <select className={inputCls + ' py-1.5'} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[0, 1, 2].map((d) => { const y = now.getFullYear() - d; return <option key={y} value={y}>{y}</option>; })}
            </select>
            <select className={inputCls + ' py-1.5'} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }).map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}. ay</option>)}
            </select>
          </div>
        }
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((r, i) => (
          <Can key={i} module={r.module} action={'EXPORT' as PermissionAction}>
            <Card
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className="card-rise p-4 flex flex-col justify-between"
            >
              <div>
                <div className="text-xs text-slate-400">{r.module}</div>
                <div className="font-medium mt-0.5">{r.title}</div>
                {r.needsMonth && <div className="text-xs text-slate-500 mt-1">Dönem: {month}/{year}</div>}
              </div>
              <div className="mt-4">
                <Button size="sm" onClick={() => downloadReport(r.path(year, month), r.file)}>PDF İndir</Button>
              </div>
            </Card>
          </Can>
        ))}
      </div>
    </div>
  );
}
