import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { parseApiError } from '@/shared/api/error';
import { toast } from '@/shared/ui/toast';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from '@/modules/auth/auth';
import { onTokenRefreshed } from '@/modules/auth/refreshSync';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const isGetRequest = (config.method ?? 'get').toUpperCase() === 'GET';
    const isPublicRequest = isGetRequest && (
      config.url === '/search'
      || config.url?.startsWith('/search?')
      || config.url === '/categories'
      || config.url?.startsWith('/categories?')
      || config.url === '/products'
      || config.url?.startsWith('/products/')
    );
    if (typeof window !== 'undefined' && !isPublicRequest) {
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
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function subscribeTokenRefresh(
  resolve: (token: string) => void,
  reject: (error: unknown) => void,
) {
  refreshSubscribers.push({ resolve, reject });
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((subscriber) => subscriber.resolve(token));
  refreshSubscribers = [];
}

function onRefreshFailed(error: unknown) {
  refreshSubscribers.forEach((subscriber) => subscriber.reject(error));
  refreshSubscribers = [];
}

function expireSession() {
  clearTokens();
  toast.info('Session expired', 'Please log in again');
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
    window.location.href = '/login';
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<unknown>) => {
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const originalRequest = error.config as RetryableRequestConfig;

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          subscribeTokenRefresh(resolve, reject);
        }).then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        isRefreshing = false;
        onRefreshFailed(error);
        expireSession();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post<{ accessToken: string; refreshToken: string }>(
          `${env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );
        setAccessToken(response.data.accessToken);
        setRefreshToken(response.data.refreshToken);
        onTokenRefreshed(response.data.accessToken, response.data.refreshToken);
        onRefreshed(response.data.accessToken);
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        onRefreshFailed(refreshError);
        expireSession();
        return Promise.reject(error);
      }
    }

    if (error.response?.data) {
      const apiError = parseApiError(error.response.data);
      if (apiError) {
        toast.error(apiError.message);
        return Promise.reject({ ...error, parsedError: apiError });
      }
    }

    toast.error('Request failed', error.message);
    return Promise.reject(error);
  },
);
