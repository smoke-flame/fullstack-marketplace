import { apiClient } from '@/shared/api/client';
import type { ProductResponse, CreateProductRequest, UpdateProductRequest, PaginatedProductsResponse } from '@marketplace/contracts/api/catalog/products';
import type { CategoryResponse, CreateCategoryRequest } from '@marketplace/contracts/api/catalog/categories';

export async function getAllCategories(signal?: AbortSignal, query?: string): Promise<CategoryResponse[]> {
  const params = query ? { q: query } : undefined;
  const response = await apiClient.get<CategoryResponse[]>('/categories', { params, signal });
  return response.data;
}

export async function getAllProducts(signal?: AbortSignal, sellerId?: string, limit = 20, offset = 0): Promise<PaginatedProductsResponse> {
  const params: Record<string, string | number> = { limit, offset };
  if (sellerId) params.sellerId = sellerId;
  const response = await apiClient.get<PaginatedProductsResponse>('/products', { params, signal });
  return response.data;
}

export async function getProductById(id: string, signal?: AbortSignal): Promise<ProductResponse> {
  const response = await apiClient.get<ProductResponse>(`/products/${id}`, { signal });
  return response.data;
}

export async function createProduct(data: CreateProductRequest): Promise<ProductResponse> {
  const response = await apiClient.post<ProductResponse>('/products', data);
  return response.data;
}

export async function updateProduct(id: string, data: UpdateProductRequest): Promise<ProductResponse> {
  const response = await apiClient.patch<ProductResponse>(`/products/${id}`, data);
  return response.data;
}

export async function archiveProduct(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}

export async function createCategory(data: CreateCategoryRequest): Promise<CategoryResponse> {
  const response = await apiClient.post<CategoryResponse>('/categories', data);
  return response.data;
}
