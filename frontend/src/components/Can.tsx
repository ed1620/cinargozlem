import { ReactNode } from 'react';
import { useAuth } from '../store/auth.store';
import { ModuleCode, PermissionAction } from '../types';

/** Belirli bir yetki yoksa çocuk bileşeni (buton vb.) gizler. */
export function Can({
  module,
  action,
  children,
}: {
  module: ModuleCode;
  action: PermissionAction;
  children: ReactNode;
}) {
  const can = useAuth((s) => s.can);
  return can(module, action) ? <>{children}</> : null;
}
