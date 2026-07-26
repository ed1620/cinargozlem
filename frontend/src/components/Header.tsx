import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.store';

export function Header({ onMenu }: { onMenu: () => void }) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-3 sm:px-6 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — sadece mobil/tablet */}
        <button
          onClick={onMenu}
          className="lg:hidden p-2 -ml-1 rounded-md hover:bg-slate-100 text-slate-600"
          aria-label="Menü"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {/* Logo yalnızca sidebar gizliyken (mobil/tablet) — masaüstünde sidebar'daki logo yeterli */}
        <img src="/logo.png" alt="Çınar Gözlem" className="h-8 w-auto object-contain lg:hidden" />
        <div className="text-xs sm:text-sm text-slate-500 font-medium hidden md:block leading-tight truncate">
          DENİZLİ ÇINAR GÖZLEM ÖZEL EĞİTİM ve REHABİLİTASYON MERKEZİ
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium leading-tight">{user?.username}</div>
          <div className="text-[11px] text-slate-500">
            {user?.isSuperAdmin ? 'Süper Yönetici' : 'Yetkili Kullanıcı'}
          </div>
        </div>
        <button
          onClick={onLogout}
          className="text-sm px-3 py-1.5 rounded-md border hover:bg-slate-50"
        >
          Çıkış
        </button>
      </div>
    </header>
  );
}
