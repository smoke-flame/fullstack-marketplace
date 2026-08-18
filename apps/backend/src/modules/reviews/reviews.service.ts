import { Injectable, Inject } from '@nestjs/common';
import { ReviewRepository, REVIEW_REPOSITORY } from './repositories/review.repository';
import { ReviewCreatedEvent, ReviewDeletedEvent } from './events';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';
import { ReviewAlreadyExistsException, ReviewNotFoundException, ReviewForbiddenException, PurchaseNotFoundException } from '@modules/common/errors/review-errors';
import type { ReviewResponse, ProductRating, CreateReviewRequest } from '@marketplace/contracts/models/review/review';

@Injectable()
export class ReviewsService {
  constructor(
    @Inject(REVIEW_REPOSITORY) private readonly reviewRepo: ReviewRepository,
    private readonly publisher: EventPublisher,
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

    await this.publisher.publish(new ReviewCreatedEvent({
      reviewId: review.id,
      productId,
      buyerId,
      rating: review.rating,
    }, ''));

    return review;
  }

  async getReviews(productId: string, cursor?: string, limit = 20): Promise<{ reviews: ReviewResponse[]; nextCursor?: string }> {
    const result = await this.reviewRepo.findByProductId(productId, cursor, limit);
    return {
      reviews: result.reviews,
      nextCursor: result.nextCursor,
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

    await this.publisher.publish(new ReviewDeletedEvent({
      reviewId,
      productId: review.productId,
    }, ''));
  }

  async onOrderCompleted(productId: string, buyerId: string, orderId: string): Promise<void> {
    await this.reviewRepo.recordPurchase({ productId, buyerId, orderId });
  }
}
