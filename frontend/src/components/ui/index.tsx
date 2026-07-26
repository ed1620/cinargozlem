import { ReactNode } from 'react';

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
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'text-xs px-2.5 py-1.5', md: 'text-sm px-3.5 py-2' };
  const variants = {
    primary: 'bg-brand text-white hover:bg-brand-dark',
    secondary: 'border border-slate-300 bg-white hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
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
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <div className="text-sm text-slate-500 mt-0.5">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ===== Card =====
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border rounded-xl ${className}`}>{children}</div>
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
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-left">
            {columns.map((c, i) => (
              <th key={i} className={`px-4 py-2.5 font-medium ${c.className ?? ''}`}>
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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <div className="p-5 overflow-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t flex justify-end gap-2">{footer}</div>}
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
  'w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand';

// ===== Money format =====
export const fmtMoney = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('tr-TR') : '-';
