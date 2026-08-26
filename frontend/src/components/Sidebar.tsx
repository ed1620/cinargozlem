import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../store/auth.store';
import { MODULE_META, ModuleCode } from '../types';
import { Spring, project, rubberband, velocityFrom } from '../lib/spring';

/**
 * Dinamik Sol Menü + responsive davranış.
 * - Masaüstü (lg+): sabit görünür, jest yok.
 * - Mobil/tablet: sürüklenebilir çekmece — parmağı birebir takip eder,
 *   uçuş halinde yakalanabilir, bırakma hızını devralır.
 * Yetkisiz modüller hiç render edilmez (backend /me/modules).
 */

const WIDTH = 256; // w-64 — kapalı konum -WIDTH, açık konum 0
const AXIS_THRESHOLD = 10; // yön kararı için histerezis (§10)

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export function Sidebar({
  open,
  onClose,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}) {
  const modules = useAuth((s) => s.modules);

  const visible: ModuleCode[] = ['DASHBOARD', ...modules.filter((m) => m !== 'DASHBOARD')];
  const order: ModuleCode[] = [
    'DASHBOARD', 'STUDENTS', 'PERSONNEL', 'FINANCE', 'VEHICLES', 'NOTIFICATIONS', 'REPORTS', 'USERS',
  ];
  const items = order.filter((m) => visible.includes(m));

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const gestureEnabled = !isDesktop && !reducedMotion;

  const asideRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const springRef = useRef<Spring | null>(null);

  // Kapalıyken görünmezlik yalnızca estetik değil: ekran dışındaki
  // bağlantılara Tab ile gidilmesini engeller.
  const [offscreen, setOffscreen] = useState(!open);

  const drag = useRef({
    active: false,
    committed: false,
    startX: 0,
    startY: 0,
    // Jestin yön kilidi devreye girdiği an — takip buradan başlar, böylece
    // histerezis eşiği kadar sıçrama olmaz.
    originX: 0,
    startValue: 0,
    history: [] as { x: number; t: number }[],
    suppressClick: false,
  });

  /**
   * Tek kare yazımı. React state'i her karede güncellemek yerine doğrudan
   * stile yazıyoruz — animate edilen iki özellik de (transform, opacity)
   * compositor'da çalışır ve yerleşimi tetiklemez.
   */
  const render = useCallback((x: number) => {
    const el = asideRef.current;
    const scrim = scrimRef.current;
    if (el) el.style.transform = `translate3d(${x}px, 0, 0)`;
    if (scrim) {
      // Karartma çekmecenin konumundan türer — ikisi tek hareket gibi okunur.
      const progress = Math.max(0, Math.min(1, 1 + x / WIDTH));
      scrim.style.opacity = String(progress);
      scrim.style.pointerEvents = progress > 0.01 ? 'auto' : 'none';
    }
  }, []);

  // Yayı bir kez kur. damping 1 = kritik sönüm: taşma yok. Taşma yalnızca
  // jestin momentum taşıdığı durumda yerinde olur, kendiliğinden açılan
  // bir menüde değil.
  useEffect(() => {
    const spring = new Spring(
      open ? 0 : -WIDTH,
      render,
      { damping: 1, response: 0.35 },
      () => {
        // Oturdu: kapalı konumdaysa klavye sırasından çıkar.
        if ((springRef.current?.value ?? 0) <= -WIDTH + 0.5) setOffscreen(true);
      },
    );
    springRef.current = spring;
    render(spring.value);
    return () => spring.stop();
    // Yalnızca ilk kurulum; sonraki değişiklikler aşağıdaki effect'ten geçer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  // Dışarıdan gelen açık/kapalı isteği (hamburger, bağlantı tıklaması, Escape).
  useEffect(() => {
    const spring = springRef.current;
    if (!spring) return;

    if (open) setOffscreen(false);

    if (isDesktop || reducedMotion) {
      // Konumu CSS devraldı; yay sessizce doğru değerde dursun.
      spring.jumpTo(open ? 0 : -WIDTH);
      if (!open && reducedMotion) {
        const t = setTimeout(() => setOffscreen(true), 200);
        return () => clearTimeout(t);
      }
      if (!open && isDesktop) setOffscreen(false);
      return;
    }

    spring.animateTo(open ? 0 : -WIDTH);
  }, [open, isDesktop, reducedMotion]);

  // Kullanıcıyı asla kapana kıstırma: açık çekmeceden Escape ile çıkılır.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /**
   * Bırakma anının kararı. Hem çekmecenin üstündeki sürükleme hem de kenardan
   * açma jesti buraya düşer — iki jest de aynı fizikle bitsin.
   */
  const settle = useCallback(
    (velocity: number) => {
      const spring = springRef.current;
      if (!spring) return;

      // Hedefi bırakma noktasına göre değil, momentumun götüreceği noktaya
      // göre seç — fiske çekmeceyi gerçekten fırlatsın.
      //
      // 0.998 serbest kaydırmanın yavaşlama oranı; burada kullanılırsa hızı
      // ~500 ile çarpar ve yavaş bir sürüklemenin ardındaki artık hız bile
      // çekmeceyi kapatmaya yeter. Bir aç/kapa kararı kaydırmadan daha çevik
      // olmalı: 0.99 çarpanı ~100'e indirir, fiske hâlâ fırlatır ama nazik
      // sürükleme yerinde kalır.
      const projected = spring.value + project(velocity, 0.99);
      const shouldClose = projected < -WIDTH / 2;

      // Bırakma hızını yaya devret: sürükleme ile animasyon arasında dikiş kalmaz.
      spring.animateTo(shouldClose ? -WIDTH : 0, velocity);

      // React state'ini jestin kararına uydur. Kapanmakta olan çekmece
      // yakalanıp geri fırlatıldıysa `open` false kalmış olur —
      // senkronlanmazsa Escape ve sonraki hamburger tıklaması yanlış
      // durumdan devam ederdi.
      if (shouldClose) onClose();
      else onOpen();
    },
    [onClose, onOpen],
  );

  /**
   * Kenardan kaydırarak açma. Ekranın sol kenarından başlayan yatay çekiş
   * çekmeceyi getirir — kapalıyken hamburger tek yol olmaktan çıkar ve
   * kapatma jestinin simetriği tamamlanır (aynı yoldan girer, aynı yoldan
   * çıkar).
   *
   * Şeffaf bir yakalayıcı katman yerine belge düzeyinde dinleniyor: kenara
   * konan görünmez bir şerit, altındaki içeriğin tıklanmasını engellerdi.
   */
  useEffect(() => {
    if (!gestureEnabled) return;

    const EDGE_ZONE = 24; // parmak genişliğine yakın, ama içeriği yutmayacak kadar dar
    let st: {
      startX: number;
      startY: number;
      startValue: number;
      committed: boolean;
      history: { x: number; t: number }[];
    } | null = null;

    const onMove = (e: PointerEvent) => {
      const spring = springRef.current;
      if (!st || !spring) return;
      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;

      if (!st.committed) {
        // Dikey niyet baskınsa jesti sayfaya bırak.
        if (Math.abs(dy) > AXIS_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
          cleanup();
          return;
        }
        // Kenardan açma yalnızca sağa doğru anlamlı.
        if (dx < AXIS_THRESHOLD) return;
        st.committed = true;
        st.startX = e.clientX; // eşik kadar sıçrama olmasın
        setOffscreen(false); // sürüklenirken görünür olmalı
        spring.stop();
      }

      // Yatay jesti üstlendik; sayfanın kaydırmaya kalkışmasını durdur.
      if (e.cancelable) e.preventDefault();

      st.history.push({ x: e.clientX, t: performance.now() });
      if (st.history.length > 12) st.history.shift();

      let x = st.startValue + (e.clientX - st.startX);
      if (x > 0) x = rubberband(x, WIDTH);
      spring.set(x);
    };

    const onUp = () => {
      const committed = st?.committed;
      const history = st?.history ?? [];
      cleanup();
      if (committed) settle(velocityFrom(history));
    };

    function cleanup() {
      st = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    }

    const onDown = (e: PointerEvent) => {
      const spring = springRef.current;
      if (!spring) return;
      // Yalnızca tamamen kapalıyken: açıksa çekmecenin kendi jesti geçerli.
      if (spring.value > -WIDTH + 0.5) return;
      if (e.clientX > EDGE_ZONE) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      st = {
        startX: e.clientX,
        startY: e.clientY,
        startValue: spring.value,
        committed: false,
        history: [{ x: e.clientX, t: performance.now() }],
      };
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    };

    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      cleanup();
    };
  }, [gestureEnabled, settle]);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!gestureEnabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const spring = springRef.current;
    if (!spring) return;

    // Yakalanabilirlik kararı React state'inden değil gerçek konumdan gelir.
    // `open` kapanış animasyonu başlar başlamaz false olur; state'e bakmak,
    // kapanmakta olan çekmecenin yakalanmasını imkânsız kılardı — oysa
    // yakalanabilmesi gereken tam da o an.
    if (spring.value <= -WIDTH + 0.5) return;

    // Uçuş halindeki hareketi olduğu yerde yakala. Animasyonun bitmesini
    // beklemek yok — düşünce ve jest aynı anda olur.
    spring.stop();

    drag.current = {
      active: true,
      committed: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: e.clientX,
      startValue: spring.value,
      history: [{ x: e.clientX, t: performance.now() }],
      suppressClick: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    if (!d.committed) {
      // Olası jestleri baştan birlikte izle, niyet netleşince kaybedeni iptal et.
      if (Math.abs(dy) > AXIS_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
        d.active = false; // dikey kaydırma kazandı — menü listesi kaysın
        return;
      }
      if (Math.abs(dx) < AXIS_THRESHOLD) return;
      d.committed = true;
      // Takibi burada sıfırla: eşik aşıldığı anda çekmece 10px zıplamasın,
      // parmağın o andaki yerinden itibaren birebir gitsin.
      d.originX = e.clientX;
      // İşaretçi öğenin dışına çıksa da takip sürsün. Yakalama başarısız
      // olursa (işaretçi artık etkin değilse) sürükleme yine de çalışsın.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* yakalama şart değil, sadece iyileştirme */
      }
    }

    d.history.push({ x: e.clientX, t: performance.now() });
    if (d.history.length > 12) d.history.shift();

    // Yakaladığı noktadan itibaren birebir: parmak nereye giderse oraya.
    let x = d.startValue + (e.clientX - d.originX);
    // Sınırların ötesinde sert duruş yerine artan direnç.
    if (x > 0) x = rubberband(x, WIDTH);
    else if (x < -WIDTH) x = -WIDTH + rubberband(x + WIDTH, WIDTH);

    springRef.current?.set(x);
  };

  const endDrag = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (!d.committed) return;

    // Sürükleme bittiğinde altındaki bağlantı tetiklenmesin.
    d.suppressClick = true;
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* yakalama zaten bırakılmış olabilir */
    }

    const spring = springRef.current;
    if (!spring) return;

    settle(velocityFrom(d.history));
  };

  return (
    <>
      {/* Mobil arka plan örtüsü — koşullu render değil: mount/unmount kapanışı
          sert keserdi, çekmeceyle birlikte sönmesi gerekiyor. */}
      <div
        ref={scrimRef}
        aria-hidden
        data-open={open}
        onClick={onClose}
        className="scrim fixed inset-0 bg-black/40 z-30 lg:hidden"
      />

      <aside
        ref={asideRef}
        data-open={open}
        aria-label="Ana menü"
        style={{ visibility: !isDesktop && offscreen ? 'hidden' : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (drag.current.suppressClick) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.suppressClick = false;
          }
        }}
        className="drawer chrome-sidebar fixed inset-y-0 left-0 z-40 w-64 text-white flex flex-col lg:static"
      >
        {/* Marka bandı — header ile AYNI yükseklik (h-16) → alt kenarlar hizalı.
            Ayırıcı çizgi yok: beyaz bandın altındaki koyu menü zaten net bir
            sınır, üstüne 1px çizgi koymak gereksiz gürültü (header'da da
            kaldırıldı, ikisi hizalı kalsın). */}
        <div className="bg-white h-16 px-4 flex items-center justify-center shrink-0">
          <img
            src="/logo.png"
            alt="Çınar Gözlem"
            draggable={false}
            className="h-10 w-auto max-w-full object-contain select-none"
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
                draggable={false}
                className={({ isActive }) =>
                  `press-feedback flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm select-none ${
                    isActive
                      ? 'bg-brand text-white font-medium shadow'
                      : 'text-white/80 hover:bg-white/10 active:bg-white/20'
                  }`
                }
              >
                <span className="text-base">{meta.icon}</span>
                {meta.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Koyu malzeme üstünde soluk gri okunmaz — kontrast bir kademe yukarı. */}
        <div className="p-3 text-[11px] text-white/55 border-t border-white/10">KG-KYP • v0.1</div>
      </aside>
    </>
  );
}
