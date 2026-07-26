import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { tokenStore } from './token';

const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({ baseURL });

// Access token'ı her isteğe ekle.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401'de bir kez refresh dene, başarısızsa oturumu kapat.
let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (status === 401 && !original._retry && tokenStore.refresh) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = axios
            .post(`${baseURL}/auth/refresh`, {
              refreshToken: tokenStore.refresh,
            })
            .then((r) => {
              tokenStore.set(r.data.accessToken, r.data.refreshToken);
              return r.data.accessToken as string;
            })
            .finally(() => {
              refreshing = null;
            });
        }
        const newToken = await refreshing;
        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${newToken}`,
        };
        return api(original);
      } catch {
        tokenStore.clear();
        if (location.pathname !== '/login') location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);
