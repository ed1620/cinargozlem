import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.store';

export function Header({ onMenu, overlapping = false }: { onMenu: () => void; overlapping?: boolean }) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="chrome-translucent sticky top-0 z-30 h-16 flex items-center justify-between px-3 sm:px-6 gap-3">
      {/* Kenar efekti — chrome içeriğin üstüne bindiğinde beliren yumuşak
          geçiş. Header'ın hemen altına taşar, akışı kesmez. */}
      <div
        aria-hidden
        data-visible={overlapping}
        className="scroll-edge pointer-events-none absolute inset-x-0 top-full h-3"
      />

      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — sadece mobil/tablet */}
        <button
          onClick={onMenu}
          className="press-feedback lg:hidden p-2 -ml-1 rounded-md text-slate-600 hover:bg-slate-100 active:bg-slate-200"
          aria-label="Menü"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {/* Logo yalnızca sidebar gizliyken (mobil/tablet) — masaüstünde sidebar'daki logo yeterli */}
        <img src="/logo.png" alt="Çınar Gözlem" className="h-8 w-auto object-contain lg:hidden" />
        {/* Yarı saydam yüzeyin üstünde düz gri metin okunurluğunu kaybeder:
            kontrast bir kademe yukarı. Küçük punto ve tamamı büyük harf
            olduğu için hafif pozitif tracking harfleri ayırıp okutur. */}
        <div className="text-xs sm:text-sm text-slate-600 font-medium tracking-[0.01em] hidden md:block leading-tight truncate">
          DENİZLİ ÇINAR GÖZLEM ÖZEL EĞİTİM ve REHABİLİTASYON MERKEZİ
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium leading-tight">{user?.username}</div>
          <div className="text-[11px] text-slate-600">
            {user?.isSuperAdmin ? 'Süper Yönetici' : 'Yetkili Kullanıcı'}
          </div>
        </div>
        {/* Geri bildirim basma anında başlar, bırakışta değil — bırakışı
            beklemek düğmeyi ölü hissettirir. */}
        <button
          onClick={onLogout}
          className="press-feedback text-sm px-3 py-1.5 rounded-md border border-slate-300/80 bg-white/60 hover:bg-white active:bg-slate-100"
        >
          Çıkış
        </button>
      </div>
    </header>
  );
}
