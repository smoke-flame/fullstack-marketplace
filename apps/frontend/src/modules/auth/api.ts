import { apiClient } from '@/shared/api/client';
import type { LoginUserRequest, LoginResponse } from '@marketplace/contracts/api/auth/login';
import type { RegisterUserRequest, RegisterUserResponse } from '@marketplace/contracts/api/auth/register';
import type { RefreshTokenRequest, RefreshTokenResponse } from '@marketplace/contracts/api/auth/refresh';
import type { MeResponse } from '@marketplace/contracts/api/auth/me';

export async function loginUser(data: LoginUserRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', data);
  return response.data;
}

export async function registerUser(data: RegisterUserRequest): Promise<RegisterUserResponse> {
  const response = await apiClient.post<RegisterUserResponse>('/auth/register', data);
  return response.data;
}

export async function refreshTokens(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
  const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', data);
  return response.data;
}

export async function logoutUser(data: { refreshToken: string }): Promise<void> {
  await apiClient.post('/auth/logout', data);
}

export async function getMe(): Promise<MeResponse> {
  const response = await apiClient.get<MeResponse>('/auth/me');
  return response.data;
}
