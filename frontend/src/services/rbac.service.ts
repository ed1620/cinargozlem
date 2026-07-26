import { ModuleCode, PermissionAction, Role } from '../types';
import { api } from './api';

export const rbacService = {
  async listRoles(): Promise<Role[]> {
    const { data } = await api.get<Role[]>('/roles');
    return data;
  },

  async meta(): Promise<{ modules: ModuleCode[]; actions: PermissionAction[] }> {
    const { data } = await api.get('/rbac/meta');
    return data;
  },

  async createRole(name: string, description?: string): Promise<Role> {
    const { data } = await api.post<Role>('/roles', { name, description });
    return data;
  },

  async setPermissions(
    roleId: string,
    permissions: { module: ModuleCode; action: PermissionAction }[],
  ): Promise<Role[]> {
    const { data } = await api.put<Role[]>(`/roles/${roleId}/permissions`, {
      permissions,
    });
    return data;
  },
};
