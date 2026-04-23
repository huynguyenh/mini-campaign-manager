import axios, { AxiosError } from 'axios';
import { store } from '../store';
import { loggedOut } from '../store/authSlice';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const apiClient = axios.create({ baseURL });

apiClient.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  (error: AxiosError<{ error?: { code?: string; message?: string } }>) => {
    if (error.response?.status === 401) {
      store.dispatch(loggedOut());
    }
    return Promise.reject(error);
  },
);

export function extractApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: { message?: string } } | undefined;
    return data?.error?.message ?? err.message;
  }
  return err instanceof Error ? err.message : 'Unexpected error';
}
