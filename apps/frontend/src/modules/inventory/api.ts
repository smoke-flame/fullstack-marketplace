import { apiClient } from '@/shared/api/client';
import type { StockResponse, SetStockRequest } from '@marketplace/contracts/api/inventory/inventory';

export async function getStock(productId: string, signal?: AbortSignal): Promise<StockResponse> {
  const response = await apiClient.get<StockResponse>(`/stock/${productId}`, { signal });
  return response.data;
}

export async function setStock(productId: string, data: SetStockRequest, signal?: AbortSignal): Promise<StockResponse> {
  const response = await apiClient.put<StockResponse>(`/stock/${productId}`, data, { signal });
  return response.data;
}
