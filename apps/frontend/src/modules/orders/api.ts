import { apiClient } from '@/shared/api/client';
import type { OrderResponse, CreateOrderRequest } from '@marketplace/contracts/api/orders/orders';

export async function createOrder(data: CreateOrderRequest): Promise<OrderResponse> {
  const response = await apiClient.post<OrderResponse>('/orders', data);
  return response.data;
}

export async function getOrders(signal?: AbortSignal): Promise<OrderResponse[]> {
  const response = await apiClient.get<OrderResponse[]>('/orders', { signal });
  return response.data;
}

export async function getOrderById(id: string, signal?: AbortSignal): Promise<OrderResponse> {
  const response = await apiClient.get<OrderResponse>(`/orders/${id}`, { signal });
  return response.data;
}

export async function cancelOrder(id: string): Promise<OrderResponse> {
  const response = await apiClient.post<OrderResponse>(`/orders/${id}/cancel`, {});
  return response.data;
}
