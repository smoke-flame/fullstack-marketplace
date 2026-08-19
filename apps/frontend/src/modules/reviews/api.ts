import { apiClient } from '@/shared/api/client';
import type { ReviewResponse, ProductRating, CreateReviewRequest, PaginatedReviewsResponse } from '@marketplace/contracts/models/review/review';

export async function createReview(productId: string, data: CreateReviewRequest): Promise<ReviewResponse> {
  const response = await apiClient.post<ReviewResponse>(`/products/${productId}/reviews`, data);
  return response.data;
}

export async function getReviews(productId: string, limit = 20, offset = 0): Promise<PaginatedReviewsResponse> {
  const response = await apiClient.get<PaginatedReviewsResponse>(`/products/${productId}/reviews?limit=${limit}&offset=${offset}`);
  return response.data;
}

export async function getRating(productId: string): Promise<ProductRating> {
  const response = await apiClient.get<ProductRating>(`/products/${productId}/rating`);
  return response.data;
}

export async function deleteReview(reviewId: string): Promise<void> {
  await apiClient.delete(`/reviews/${reviewId}`);
}
