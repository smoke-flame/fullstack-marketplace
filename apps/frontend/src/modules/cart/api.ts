import { apiClient } from '@/shared/api/client';
import type { CartResponse } from '@marketplace/contracts/api/cart/cart';
import { z } from 'zod';

export const upsertCartItemRequestSchema = z.object({
  qty: z.number().int().nonnegative().max(99),
});

export type UpsertCartItemRequest = z.infer<typeof upsertCartItemRequestSchema>;

export async function getCart(signal?: AbortSignal): Promise<CartResponse> {
  const response = await apiClient.get<CartResponse>('/cart', { signal });
  return response.data;
}

export async function upsertItem(productId: string, data: UpsertCartItemRequest, signal?: AbortSignal): Promise<CartResponse> {
  const response = await apiClient.put<CartResponse>(`/cart/items/${productId}`, data, { signal });
  return response.data;
}

export async function removeItem(productId: string, signal?: AbortSignal): Promise<void> {
  await apiClient.delete(`/cart/items/${productId}`, { signal });
}

export async function clearCart(signal?: AbortSignal): Promise<void> {
  await apiClient.delete('/cart', { signal });
}
