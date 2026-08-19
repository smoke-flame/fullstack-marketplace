import type { Review, ProductRating } from '@marketplace/contracts/models/review/review';
import type { PaginatedReviewsResponse } from '@marketplace/contracts/models/review/review';

export interface ReviewRepository {
  create(data: { productId: string; buyerId: string; rating: number; text?: string }): Promise<Review>;
  findByProductId(productId: string, limit: number, offset: number): Promise<Omit<PaginatedReviewsResponse, 'limit' | 'offset'>>;
  findById(reviewId: string): Promise<Review | null>;
  findByBuyerIdAndProductId(buyerId: string, productId: string): Promise<Review | null>;
  delete(reviewId: string, buyerId: string): Promise<void>;
  getProductRating(productId: string): Promise<ProductRating | null>;
  upsertProductRating(productId: string): Promise<ProductRating>;
  recordPurchase(data: { productId: string; buyerId: string; orderId: string }): Promise<void>;
  hasPurchased(productId: string, buyerId: string): Promise<boolean>;
}

export const REVIEW_REPOSITORY = Symbol('REVIEW_REPOSITORY');
