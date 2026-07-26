import { NavLink } from 'react-router-dom';
import { useAuth } from '../store/auth.store';
import { MODULE_META, ModuleCode } from '../types';

/**
 * Dinamik Sol Menü + responsive davranış.
 * - Masaüstü (lg+): sabit görünür.
 * - Mobil/tablet: hamburger ile açılan kayar çekmece (drawer) + arka plan örtüsü.
 * Yetkisiz modüller hiç render edilmez (backend /me/modules).
 */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const modules = useAuth((s) => s.modules);

  const visible: ModuleCode[] = ['DASHBOARD', ...modules.filter((m) => m !== 'DASHBOARD')];
  const order: ModuleCode[] = [
    'DASHBOARD', 'STUDENTS', 'PERSONNEL', 'FINANCE', 'VEHICLES', 'NOTIFICATIONS', 'REPORTS', 'USERS',
  ];
  const items = order.filter((m) => visible.includes(m));

  return (
    <>
      {/* Mobil arka plan örtüsü */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-ink text-white flex flex-col
          transform transition-transform duration-200 lg:static lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Marka bandı — header ile AYNI yükseklik (h-16) → alt kenarlar hizalı */}
        <div className="bg-white h-16 px-4 flex items-center justify-center shrink-0 border-b border-slate-200">
          <img
            src="/logo.png"
            alt="Çınar Gözlem"
            className="h-10 w-auto max-w-full object-contain"
          />
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((m) => {
            const meta = MODULE_META[m];
            return (
              <NavLink
                key={m}
                to={meta.path}
                end={meta.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    isActive ? 'bg-brand text-white font-medium shadow' : 'text-white/80 hover:bg-white/10'
                  }`
                }
              >
                <span className="text-base">{meta.icon}</span>
                {meta.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 text-[11px] text-white/40 border-t border-white/10">KG-KYP • v0.1</div>
      </aside>
    </>
  );
}
