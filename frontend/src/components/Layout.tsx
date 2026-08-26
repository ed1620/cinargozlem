import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [open, setOpen] = useState(false);
  // Header artık kayan alanın içinde duruyor; içerik altından geçtiği için
  // "chrome içeriğin üstünde yüzüyor mu" bilgisi kenar efektini sürüyor.
  const [overlapping, setOverlapping] = useState(false);

  return (
    <div className="h-full flex">
      <Sidebar open={open} onClose={() => setOpen(false)} onOpen={() => setOpen(true)} />
      <div className="flex-1 flex flex-col min-w-0">
        <main
          className="flex-1 overflow-auto"
          onScroll={(e) => {
            const past = e.currentTarget.scrollTop > 0;
            // Sadece durum değiştiğinde render et — her scroll karesinde değil.
            setOverlapping((prev) => (prev === past ? prev : past));
          }}
        >
          <Header onMenu={() => setOpen(true)} overlapping={overlapping} />
          <div className="p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
