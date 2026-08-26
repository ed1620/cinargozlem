import { ReactNode, useEffect, useRef, useState } from 'react';

// ===== Button =====
export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
}) {
  // press-feedback: geri bildirim basma anında başlar, bırakışta değil.
  // focus-visible: klavyeyle gezen kullanıcı nerede olduğunu görmeli — ama
  // fareyle tıklayana halka gösterilmez.
  const base =
    'press-feedback inline-flex items-center justify-center gap-1.5 rounded-md font-medium ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
  const sizes = { sm: 'text-xs px-2.5 py-1.5', md: 'text-sm px-3.5 py-2' };
  const variants = {
    primary: 'bg-brand text-white hover:bg-brand-dark active:bg-brand-dark',
    secondary: 'border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    ghost: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

// ===== PageHeader =====
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
      <div>
        {/* Büyük metin büyüdükçe harfler açılır; negatif tracking toplar. */}
        <h1 className="text-xl font-semibold tracking-[-0.015em]">{title}</h1>
        {subtitle && <div className="text-sm text-slate-500 mt-0.5">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ===== Card =====
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  // Sert 1px kenarlık yerine yarı saydam gölge: kart arka planın üstünde
  // duran gerçek bir yüzey gibi okunur (dashboard'daki StatCard ile aynı
  // reçete — aynı görünen şeyler aynı davranmalı).
  return (
    <div
      className={`bg-white rounded-xl shadow-[0_1px_2px_rgba(47,52,58,0.04),0_4px_12px_-4px_rgba(47,52,58,0.08)] ring-1 ring-slate-900/5 ${className}`}
    >
      {children}
    </div>
  );
}

// ===== Badge =====
export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'green' | 'red' | 'amber' | 'blue';
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${tones[tone]}`}>
      {children}
    </span>
  );
}

// ===== DataTable =====
export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}
export function DataTable<T>({
  columns,
  rows,
  empty = 'Kayıt bulunamadı.',
  keyOf,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
  keyOf: (row: T) => string;
}) {
  return (
    <div className="overflow-x-auto">
      {/* tabular-nums tabloya bütün olarak veriliyor: para, tarih ve sayaç
          sütunlarında rakam genişliği sabit kalır, satırlar arasında
          basamaklar hizalanır ve veri tazelenince sayılar zıplamaz. */}
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-left">
            {columns.map((c, i) => (
              // Küçük punto başlıkta hafif pozitif tracking okunurluğu artırır.
              <th key={i} className={`px-4 py-2.5 font-medium tracking-[0.01em] ${c.className ?? ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={keyOf(row)} className="border-t hover:bg-slate-50/60">
                {columns.map((c, i) => (
                  <td key={i} className={`px-4 py-2.5 ${c.className ?? ''}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ===== Modal =====
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  // Kapanış animasyonu bitene kadar DOM'da kal — anında unmount, pencereyi
  // hiçbir yere gitmemiş gibi gösterirdi.
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const oncekiOdak = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      oncekiOdak.current = document.activeElement as HTMLElement | null;
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
      // Odağı diyaloğu açan öğeye geri ver — kullanıcı kaldığı yerden devam etsin.
      oncekiOdak.current?.focus?.();
    }, 200);
    return () => clearTimeout(t);
  }, [open, mounted]);

  // Odağı diyaloğun içine al; aksi halde klavye kullanıcısı arkadaki
  // sayfada gezmeye devam eder.
  useEffect(() => {
    if (open && mounted) panelRef.current?.focus();
  }, [open, mounted]);

  // Kullanıcıyı asla kapana kıstırma.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 ${
        closing ? 'scrim-out' : 'scrim-in'
      }`}
      // Karartmaya tıklamak kapatır — modal görevlerde beklenen çıkış yolu.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`bg-white rounded-xl shadow-xl w-full outline-none ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] flex flex-col ${
          closing ? 'modal-out' : 'modal-in'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/70">
          <h2 className="font-semibold tracking-[-0.01em]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="press-feedback text-slate-400 hover:text-slate-700 active:text-slate-900 text-xl leading-none rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            ×
          </button>
        </div>
        <div className="p-5 overflow-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-slate-200/70 flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
}

// ===== Field (label + control) =====
export function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white ' +
  'transition-[border-color,box-shadow] duration-100 ease-out ' +
  'hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand ' +
  'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed';

// ===== Money format =====
export const fmtMoney = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('tr-TR') : '-';
