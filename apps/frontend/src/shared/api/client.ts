import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { parseApiError } from '@/shared/api/error';
import { toast } from '@/shared/ui/toast';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from '@/modules/auth/auth';
import { refreshTokens } from '@/modules/auth/api';
import { onTokenRefreshed } from '@/modules/auth/refreshSync';

export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<unknown>) => {
    const status = error.response?.status;
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        isRefreshing = false;
        clearTokens();
        toast.info('Session expired', 'Please log in again');
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response = await refreshTokens({ refreshToken });
        setAccessToken(response.accessToken);
        setRefreshToken(response.refreshToken);
        onTokenRefreshed(response.accessToken, response.refreshToken);
        onRefreshed(response.accessToken);
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
        }
        return apiClient(originalRequest);
      } catch {
        isRefreshing = false;
        refreshSubscribers = [];
        clearTokens();
        toast.info('Session expired', 'Please log in again');
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    if (error.response?.data) {
      const apiError = parseApiError(error.response.data);
      if (apiError) {
        toast.error(apiError.message, apiError.correlationId);
        return Promise.reject({ ...error, parsedError: apiError });
      }
    }

    toast.error('Request failed', error.message);
    return Promise.reject(error);
  },
);
