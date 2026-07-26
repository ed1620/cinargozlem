import { create } from 'zustand';
import { api } from '../services/api';
import { tokenStore } from '../services/token';
import {
  AuthUser,
  ModuleCode,
  ModulePermission,
  PermissionAction,
} from '../types';

interface AuthState {
  user: AuthUser | null;
  modules: ModuleCode[]; // erişilebilir modüller (dinamik sidebar)
  matrix: ModulePermission[]; // modül → izinli işlemler
  loading: boolean;
  initialized: boolean;

  login: (username: string, password: string) => Promise<void>;
  loadMe: () => Promise<void>;
  logout: () => Promise<void>;
  can: (module: ModuleCode, action: PermissionAction) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  modules: [],
  matrix: [],
  loading: false,
  initialized: false,

  login: async (username, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { username, password });
      tokenStore.set(data.accessToken, data.refreshToken);
      await get().loadMe();
    } finally {
      set({ loading: false });
    }
  },

  loadMe: async () => {
    if (!tokenStore.access) {
      set({ initialized: true });
      return;
    }
    const [me, modules, permissions] = await Promise.all([
      api.get<AuthUser>('/me'),
      api.get<ModuleCode[]>('/me/modules'),
      api.get<ModulePermission[]>('/me/permissions'),
    ]);
    set({
      user: me.data,
      modules: modules.data,
      matrix: permissions.data,
      initialized: true,
    });
  },

  logout: async () => {
    try {
      if (tokenStore.refresh) {
        await api.post('/auth/logout', { refreshToken: tokenStore.refresh });
      }
    } catch {
      /* yoksay */
    }
    tokenStore.clear();
    set({ user: null, modules: [], matrix: [] });
  },

  can: (module, action) => {
    const { user, matrix } = get();
    if (user?.isSuperAdmin) return true;
    return !!matrix
      .find((m) => m.module === module)
      ?.actions.includes(action);
  },
}));
