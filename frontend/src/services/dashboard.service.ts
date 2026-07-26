import { DashboardSummary } from '../types';
import { api } from './api';

export const dashboardService = {
  async summary(): Promise<DashboardSummary> {
    const { data } = await api.get<DashboardSummary>('/dashboard/summary');
    return data;
  },
};
