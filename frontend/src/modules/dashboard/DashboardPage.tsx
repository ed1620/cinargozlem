import { ReactNode, useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboard.service';
import { DashboardSummary } from '../../types';

const money = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

const TONES: Record<string, string> = {
  brand: 'bg-brand/10 text-brand',
  sage: 'bg-sage/10 text-sage',
  green: 'bg-emerald-100 text-emerald-600',
  red: 'bg-red-100 text-red-600',
  amber: 'bg-amber-100 text-amber-600',
  blue: 'bg-blue-100 text-blue-600',
  slate: 'bg-slate-100 text-slate-500',
};

function StatCard({
  icon,
  label,
  value,
  tone = 'slate',
  valueClass = 'text-slate-800',
  hint,
  delay = 0,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone?: keyof typeof TONES;
  valueClass?: string;
  hint?: string;
  delay?: number;
}) {
  return (
    // Sert 1px kenarlık yerine yarı saydam gölge: kart, arka planın üstünde
    // duran gerçek bir yüzey gibi okunur. Kart tıklanabilir olmadığı için
    // hover'da yükselme yok — tıklanamayan bir şeye tıklanabilir görüntüsü
    // vermek yanlış bir vaat.
    <div
      className="card-rise bg-white rounded-xl p-4 sm:p-5 flex items-center gap-4 shadow-[0_1px_2px_rgba(47,52,58,0.04),0_4px_12px_-4px_rgba(47,52,58,0.08)] ring-1 ring-slate-900/5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`h-11 w-11 shrink-0 rounded-xl grid place-items-center text-lg ${TONES[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500 truncate">{label}</div>
        {/* Büyük rakamlar büyüdükçe harfler fazla açılır — negatif tracking
            bunu toplar. tabular-nums, veri tazelendiğinde rakam genişliği
            değişip sayının zıplamasını önler. */}
        <div className={`text-2xl font-bold leading-tight tabular-nums tracking-[-0.02em] ${valueClass}`}>
          {value}
        </div>
        {hint && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

/* Yükleme durumu son yerleşimin birebir iskeleti — veri gelince kartlar
   yerinde belirir, sayfa zıplamaz. */
function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 flex items-center gap-4 shadow-[0_1px_2px_rgba(47,52,58,0.04),0_4px_12px_-4px_rgba(47,52,58,0.08)] ring-1 ring-slate-900/5">
      <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-100 animate-pulse" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
        <div className="h-6 w-16 rounded bg-slate-100 animate-pulse" />
      </div>
    </div>
  );
}

function SkeletonSection({ count }: { count: number }) {
  return (
    <section>
      <div className="h-3 w-28 rounded bg-slate-200/70 animate-pulse mb-2.5" />
      <div className={`grid gap-4 sm:grid-cols-2 ${count === 4 ? 'xl:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {Array.from({ length: count }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
      {children}
    </h2>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardService.summary().then(setData).catch(() => setError('Özet verileri alınamadı.'));
  }, []);

  const today = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="space-y-7 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold text-slate-800 tracking-[-0.015em]">Kontrol Paneli</h1>
        <p className="text-sm text-slate-500 capitalize">{today}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {!data ? (
        <>
          <SkeletonSection count={4} />
          <SkeletonSection count={3} />
          <SkeletonSection count={3} />
        </>
      ) : (
        <>
          {/* Özet */}
          <section>
            <SectionTitle>Genel Özet</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon="🎓" label="Aktif Öğrenci" value={data.students.active} tone="brand" delay={0} />
              <StatCard icon="🎓" label="Pasif Öğrenci" value={data.students.passive} tone="slate" delay={40} />
              <StatCard icon="👥" label="Aktif Personel" value={data.personnel.active} tone="blue" delay={80} />
              <StatCard
                icon="🔔"
                label="Okunmamış Bildirim"
                value={data.alerts.unreadNotifications}
                tone="amber"
                valueClass={data.alerts.unreadNotifications > 0 ? 'text-amber-600' : 'text-slate-800'}
                delay={120}
              />
            </div>
          </section>

          {/* Finansal durum */}
          <section>
            <SectionTitle>Finansal Durum</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard icon="📈" label="Toplam Gelir" value={money(data.finance.totalIncome)} tone="green" valueClass="text-emerald-600" delay={160} />
              <StatCard icon="📉" label="Toplam Gider" value={money(data.finance.totalExpense)} tone="red" valueClass="text-red-600" delay={200} />
              <StatCard
                icon="⚖️"
                label="Net Bakiye"
                value={money(data.finance.balance)}
                tone={data.finance.balance < 0 ? 'red' : 'brand'}
                valueClass={data.finance.balance < 0 ? 'text-red-600' : 'text-brand'}
                delay={240}
              />
            </div>
          </section>

          {/* Yaklaşan / bekleyen */}
          <section>
            <SectionTitle>Yaklaşan / Bekleyen İşlemler</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                icon="🚗"
                label="Yaklaşan Sigorta (30 gün)"
                value={data.alerts.upcomingInsurance}
                tone="amber"
                valueClass={data.alerts.upcomingInsurance > 0 ? 'text-amber-600' : 'text-slate-800'}
                delay={280}
              />
              <StatCard
                icon="🔧"
                label="Yaklaşan Muayene (30 gün)"
                value={data.alerts.upcomingInspection}
                tone="amber"
                valueClass={data.alerts.upcomingInspection > 0 ? 'text-amber-600' : 'text-slate-800'}
                delay={320}
              />
              <StatCard
                icon="💰"
                label="Ödenmemiş Maaş"
                value={data.alerts.unpaidSalaries}
                tone="red"
                valueClass={data.alerts.unpaidSalaries > 0 ? 'text-red-600' : 'text-slate-800'}
                delay={360}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
