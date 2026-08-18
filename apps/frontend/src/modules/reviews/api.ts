import { apiClient } from '@/shared/api/client';
import type { ReviewResponse, ProductRating, CreateReviewRequest } from '@marketplace/contracts/models/review/review';

export async function createReview(productId: string, data: CreateReviewRequest): Promise<ReviewResponse> {
  const response = await apiClient.post<ReviewResponse>(`/products/${productId}/reviews`, data);
  return response.data;
}

export async function getReviews(productId: string, cursor?: string, limit = 20): Promise<{ reviews: ReviewResponse[]; nextCursor?: string }> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));
  const response = await apiClient.get<{ reviews: ReviewResponse[]; nextCursor?: string }>(`/products/${productId}/reviews?${params.toString()}`);
  return response.data;
}

export async function getRating(productId: string): Promise<ProductRating> {
  const response = await apiClient.get<ProductRating>(`/products/${productId}/rating`);
  return response.data;
}

export async function deleteReview(reviewId: string): Promise<void> {
  await apiClient.delete(`/reviews/${reviewId}`);
}
