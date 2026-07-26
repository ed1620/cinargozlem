import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth.store';
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
    return (
      <div className="h-full grid place-items-center text-slate-400">
        Yükleniyor…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  if (module && module !== 'DASHBOARD' && !modules.includes(module)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
