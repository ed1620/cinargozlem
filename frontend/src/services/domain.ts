import { api } from './api';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  counts?: { active: number; passive: number; all: number };
}

// ================= PERSONEL =================
export const personnelApi = {
  list: (params?: any) =>
    api.get<Paginated<any>>('/personnel', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/personnel/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/personnel', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.patch(`/personnel/${id}`, data).then((r) => r.data),
  setStatus: (id: string, status: string) =>
    api.patch(`/personnel/${id}/status/${status}`).then((r) => r.data),
  remove: (id: string) => api.delete(`/personnel/${id}`).then((r) => r.data),
  payrolls: (id: string) =>
    api.get(`/personnel/${id}/payrolls`).then((r) => r.data),
  createPayroll: (data: any) => api.post('/payrolls', data).then((r) => r.data),
  payPayroll: (id: string) =>
    api.patch(`/payrolls/${id}/pay`, {}).then((r) => r.data),
  removePayroll: (id: string) =>
    api.delete(`/payrolls/${id}`).then((r) => r.data),
  leaves: (id: string) => api.get(`/personnel/${id}/leaves`).then((r) => r.data),
  leaveSummary: (id: string, year: number) =>
    api.get(`/personnel/${id}/leave-summary`, { params: { year } }).then((r) => r.data),
  setEntitlement: (id: string, data: any) =>
    api.put(`/personnel/${id}/entitlement`, data).then((r) => r.data),
  createLeave: (data: any) => api.post('/leaves', data).then((r) => r.data),
  removeLeave: (id: string) => api.delete(`/leaves/${id}`).then((r) => r.data),
};

// ================= FİNANS =================
export const financeApi = {
  categories: (type?: string) =>
    api.get('/finance/categories', { params: { type } }).then((r) => r.data),
  createCategory: (data: any) =>
    api.post('/finance/categories', data).then((r) => r.data),
  updateCategory: (id: string, data: any) =>
    api.patch(`/finance/categories/${id}`, data).then((r) => r.data),
  balance: (params?: any) =>
    api.get('/finance/balance', { params }).then((r) => r.data),
  incomes: (params?: any) =>
    api.get<Paginated<any>>('/finance/incomes', { params }).then((r) => r.data),
  createIncome: (data: any) =>
    api.post('/finance/incomes', data).then((r) => r.data),
  removeIncome: (id: string) =>
    api.delete(`/finance/incomes/${id}`).then((r) => r.data),
  expenses: (params?: any) =>
    api.get<Paginated<any>>('/finance/expenses', { params }).then((r) => r.data),
  createExpense: (data: any) =>
    api.post('/finance/expenses', data).then((r) => r.data),
  removeExpense: (id: string) =>
    api.delete(`/finance/expenses/${id}`).then((r) => r.data),
};

// ================= ARAÇ =================
export const vehiclesApi = {
  list: (params?: any) =>
    api.get<Paginated<any>>('/vehicles', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/vehicles/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/vehicles', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.patch(`/vehicles/${id}`, data).then((r) => r.data),
  setStatus: (id: string, status: string) =>
    api.patch(`/vehicles/${id}/status/${status}`).then((r) => r.data),
  remove: (id: string) => api.delete(`/vehicles/${id}`).then((r) => r.data),
  addInsurance: (id: string, data: any) =>
    api.post(`/vehicles/${id}/insurances`, data).then((r) => r.data),
  removeInsurance: (id: string) =>
    api.delete(`/vehicles/insurances/${id}`).then((r) => r.data),
  addInspection: (id: string, data: any) =>
    api.post(`/vehicles/${id}/inspections`, data).then((r) => r.data),
  fuel: (id: string) => api.get(`/vehicles/${id}/fuel`).then((r) => r.data),
  addFuel: (id: string, data: any) =>
    api.post(`/vehicles/${id}/fuel`, data).then((r) => r.data),
  removeFuel: (id: string) =>
    api.delete(`/vehicles/fuel/${id}`).then((r) => r.data),
  maintenance: (id: string) =>
    api.get(`/vehicles/${id}/maintenance`).then((r) => r.data),
  addMaintenance: (id: string, data: any) =>
    api.post(`/vehicles/${id}/maintenance`, data).then((r) => r.data),
  removeMaintenance: (id: string) =>
    api.delete(`/vehicles/maintenance/${id}`).then((r) => r.data),
};

// ================= ÖĞRENCİ =================
export const studentsApi = {
  list: (params?: any) =>
    api.get<Paginated<any>>('/students', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/students/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/students', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.patch(`/students/${id}`, data).then((r) => r.data),
  setStatus: (id: string, status: string) =>
    api.patch(`/students/${id}/status/${status}`).then((r) => r.data),
  remove: (id: string) => api.delete(`/students/${id}`).then((r) => r.data),
  activities: (id: string, params?: any) =>
    api.get(`/students/${id}/activities`, { params }).then((r) => r.data),
  addActivity: (id: string, data: any) =>
    api.post(`/students/${id}/activities`, data).then((r) => r.data),
  removeActivity: (id: string) =>
    api.delete(`/students/activities/${id}`).then((r) => r.data),
  addImages: (actId: string, files: FileList) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('images', f));
    return api
      .post(`/students/activities/${actId}/images`, fd)
      .then((r) => r.data);
  },
  removeImage: (imageId: string) =>
    api.delete(`/students/activities/images/${imageId}`).then((r) => r.data),
};

// ================= KULLANICI =================
export const usersApi = {
  list: () => api.get('/users').then((r) => r.data),
  create: (data: any) => api.post('/users', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.patch(`/users/${id}`, data).then((r) => r.data),
  setStatus: (id: string, status: string) =>
    api.patch(`/users/${id}/status/${status}`).then((r) => r.data),
  assignRoles: (id: string, roleIds: string[]) =>
    api.put(`/users/${id}/roles`, { roleIds }).then((r) => r.data),
  resetPassword: (id: string, password: string) =>
    api.patch(`/users/${id}/password`, { password }).then((r) => r.data),
  remove: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
};

// ================= BİLDİRİM =================
export const notificationsApi = {
  list: (unread = false) =>
    api.get('/notifications', { params: { unread } }).then((r) => r.data),
  unreadCount: () =>
    api.get('/notifications/unread-count').then((r) => r.data.count),
  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then((r) => r.data),
  runChecks: () => api.post('/notifications/run-checks', {}).then((r) => r.data),
};

// ================= DOSYA YÜKLEME (fiş/fatura/poliçe) =================
export const uploadsApi = {
  receipt: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/uploads/receipt', fd).then((r) => r.data as { url: string; fileName: string });
  },
  document: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/uploads/document', fd).then((r) => r.data as { url: string; fileName: string });
  },
};

// ================= RAPOR (PDF indirme) =================
export async function downloadReport(path: string, filename: string) {
  const res = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Yüklenen görseller /uploads üzerinden (dev'de vite proxy) servis edilir.
export const assetUrl = (u: string) => u;
