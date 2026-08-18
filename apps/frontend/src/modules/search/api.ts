import { apiClient } from '@/shared/api/client';
import type { SearchRequest, SearchResponse } from '@marketplace/contracts/api/search/search';

export async function search(query: SearchRequest): Promise<SearchResponse> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.categoryId) params.set('categoryId', query.categoryId);
  if (query.priceMin !== undefined) params.set('priceMin', String(query.priceMin));
  if (query.priceMax !== undefined) params.set('priceMax', String(query.priceMax));
  if (query.sellerId) params.set('sellerId', query.sellerId);
  if (query.sort) params.set('sort', query.sort);
  if (query.limit) params.set('limit', String(query.limit));
  if (query.cursor) params.set('cursor', query.cursor);

  const response = await apiClient.get<SearchResponse>(`/search?${params.toString()}`);
  return response.data;
}
