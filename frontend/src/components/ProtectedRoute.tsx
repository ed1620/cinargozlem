import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth.store';
import { PageSkeleton } from './ui';
import { ModuleCode } from '../types';

interface Props {
  children: ReactNode;
  /** Bu modüle en az VIEW yetkisi gerektirir. */
  module?: ModuleCode;
}

/** Kimlik + (opsiyonel) modül yetkisi kontrolü yapan route sarmalayıcı. */
export function ProtectedRoute({ children, module }: Props) {
  const { user, modules, initialized } = useAuth();

  if (!initialized) {
    // Uygulama açılışı — çıplak bir "Yükleniyor" metni yerine gelecek
    // yerleşimin yerini tutan iskelet: oturum çözülünce sayfa zıplamaz.
    return (
      <div className="p-4 sm:p-6" aria-busy="true" aria-live="polite">
        <PageSkeleton rows={2} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  if (module && module !== 'DASHBOARD' && !modules.includes(module)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
