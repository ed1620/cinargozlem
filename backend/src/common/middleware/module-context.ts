import { ModuleCode } from '@prisma/client';

/**
 * API route öneki → ModuleCode eşlemesi.
 * Hem modül-filtre middleware'i hem audit log bu haritayı kullanır.
 */
export const ROUTE_MODULE_MAP: Record<string, ModuleCode> = {
  users: ModuleCode.USERS,
  roles: ModuleCode.USERS,
  personnel: ModuleCode.PERSONNEL,
  payroll: ModuleCode.PERSONNEL,
  leaves: ModuleCode.PERSONNEL,
  finance: ModuleCode.FINANCE,
  incomes: ModuleCode.FINANCE,
  expenses: ModuleCode.FINANCE,
  categories: ModuleCode.FINANCE,
  vehicles: ModuleCode.VEHICLES,
  insurances: ModuleCode.VEHICLES,
  inspections: ModuleCode.VEHICLES,
  fuel: ModuleCode.VEHICLES,
  maintenance: ModuleCode.VEHICLES,
  students: ModuleCode.STUDENTS,
  activities: ModuleCode.STUDENTS,
  notifications: ModuleCode.NOTIFICATIONS,
  reports: ModuleCode.REPORTS,
};

/** İstek yolundan (/api/<segment>/...) modülü çözer. */
export function resolveModuleFromPath(path: string): ModuleCode | undefined {
  const clean = path.replace(/^\/?api\//, '').replace(/^\//, '');
  const segment = clean.split('/')[0]?.split('?')[0];
  return segment ? ROUTE_MODULE_MAP[segment] : undefined;
}

// Express Request'e eklenen alanlar için tip genişletmesi.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      moduleContext?: ModuleCode;
    }
  }
}
