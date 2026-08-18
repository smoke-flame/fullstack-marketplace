import { apiClient } from '@/shared/api/client';
import type { ProductResponse, CreateProductRequest, UpdateProductRequest } from '@marketplace/contracts/api/catalog/products';
import type { CategoryResponse, CreateCategoryRequest } from '@marketplace/contracts/api/catalog/categories';

export async function getAllCategories(signal?: AbortSignal): Promise<CategoryResponse[]> {
  const response = await apiClient.get<CategoryResponse[]>('/categories', { signal });
  return response.data;
}

export async function getAllProducts(signal?: AbortSignal): Promise<ProductResponse[]> {
  const response = await apiClient.get<ProductResponse[]>('/products', { signal });
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
