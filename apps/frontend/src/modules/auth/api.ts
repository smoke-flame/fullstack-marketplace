import { apiClient } from '@/shared/api/client';
import type { LoginUserRequest, AuthResponse } from '@marketplace/contracts/api/auth/login';
import type { RegisterUserRequest } from '@marketplace/contracts/api/auth/register';
import type { RefreshTokenRequest, RefreshTokenResponse } from '@marketplace/contracts/api/auth/refresh';

export async function loginUser(data: LoginUserRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', data);
  return response.data;
}

export async function registerUser(data: RegisterUserRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/register', data);
  return response.data;
}

export async function refreshTokens(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
  const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', data);
  return response.data;
}
