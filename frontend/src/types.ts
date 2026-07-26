// Backend enum'ları ile birebir eşleşir (Prisma ModuleCode / PermissionAction).

export type ModuleCode =
  | 'DASHBOARD'
  | 'USERS'
  | 'PERSONNEL'
  | 'FINANCE'
  | 'VEHICLES'
  | 'STUDENTS'
  | 'NOTIFICATIONS'
  | 'REPORTS';

export type PermissionAction =
  | 'VIEW'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT';

export interface AuthUser {
  userId: string;
  username: string;
  isSuperAdmin: boolean;
}

export interface ModulePermission {
  module: ModuleCode;
  actions: PermissionAction[];
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions: { module: ModuleCode; action: PermissionAction }[];
  _count: { users: number };
}

export interface DashboardSummary {
  students: { active: number; passive: number };
  personnel: { active: number };
  finance: { totalIncome: number; totalExpense: number; balance: number };
  alerts: {
    unreadNotifications: number;
    upcomingInsurance: number;
    upcomingInspection: number;
    unpaidSalaries: number;
  };
}

/** Sidebar ve yetki ekranı için modül üst verisi. */
export const MODULE_META: Record<
  ModuleCode,
  { label: string; icon: string; path: string }
> = {
  DASHBOARD: { label: 'Kontrol Paneli', icon: '📊', path: '/' },
  STUDENTS: { label: 'Öğrenci Takip', icon: '🎓', path: '/students' },
  PERSONNEL: { label: 'Personel & Bordro', icon: '👥', path: '/personnel' },
  FINANCE: { label: 'Gelir - Gider', icon: '💰', path: '/finance' },
  VEHICLES: { label: 'Araç & Akaryakıt', icon: '🚐', path: '/vehicles' },
  NOTIFICATIONS: { label: 'Uyarılar', icon: '🔔', path: '/notifications' },
  REPORTS: { label: 'Raporlar', icon: '📄', path: '/reports' },
  USERS: { label: 'Kullanıcı & Yetki', icon: '🔐', path: '/users' },
};

export const ACTION_LABEL: Record<PermissionAction, string> = {
  VIEW: 'Görüntüle',
  CREATE: 'Ekle',
  UPDATE: 'Güncelle',
  DELETE: 'Sil',
  EXPORT: 'Rapor',
};
