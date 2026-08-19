import { Injectable, Inject } from '@nestjs/common';
import { ReviewRepository, REVIEW_REPOSITORY } from './repositories/review.repository';
import { ReviewAlreadyExistsException, ReviewNotFoundException, ReviewForbiddenException, PurchaseNotFoundException } from '@modules/common/errors/review-errors';
import type { ReviewResponse, CreateReviewRequest, ProductRating } from '@marketplace/contracts/models/review/review';
import type { PaginatedReviewsResponse } from '@marketplace/contracts/models/review/review';

@Injectable()
export class ReviewsService {
  constructor(
    @Inject(REVIEW_REPOSITORY) private readonly reviewRepo: ReviewRepository,
  ) {}

  async createReview(productId: string, buyerId: string, data: CreateReviewRequest): Promise<ReviewResponse> {
    const existing = await this.reviewRepo.findByBuyerIdAndProductId(buyerId, productId);
    if (existing) {
      throw new ReviewAlreadyExistsException();
    }

    const hasPurchased = await this.reviewRepo.hasPurchased(productId, buyerId);
    if (!hasPurchased) {
      throw new PurchaseNotFoundException();
    }

    const review = await this.reviewRepo.create({
      productId,
      buyerId,
      rating: data.rating,
      text: data.text,
    });

    await this.reviewRepo.upsertProductRating(productId);

    return review;
  }

  async getReviews(productId: string, limit: number, offset: number): Promise<PaginatedReviewsResponse> {
    const result = await this.reviewRepo.findByProductId(productId, limit, offset);
    return {
      items: result.items,
      total: result.total,
      limit,
      offset,
    };
  }

  async getRating(productId: string): Promise<ProductRating | null> {
    return this.reviewRepo.getProductRating(productId);
  }

  async deleteReview(reviewId: string, buyerId: string): Promise<void> {
    const review = await this.reviewRepo.findById(reviewId);
    if (!review) {
      throw new ReviewNotFoundException();
    }
    if (review.buyerId !== buyerId) {
      throw new ReviewForbiddenException();
    }

    await this.reviewRepo.delete(reviewId, buyerId);
    await this.reviewRepo.upsertProductRating(review.productId);
  }

  async onOrderCompleted(productId: string, buyerId: string, orderId: string): Promise<void> {
    await this.reviewRepo.recordPurchase({ productId, buyerId, orderId });
  }
}
