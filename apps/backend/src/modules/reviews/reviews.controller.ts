import { Controller, Delete, Get, Param, Post, Req, UseGuards, Query, UsePipes } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtGatewayGuard } from '@modules/gateway/guards/jwt-gateway.guard';
import type { GatewayRequest } from '@modules/gateway/middleware/correlation-id.middleware';
import type { ReviewResponse, ProductRating, CreateReviewRequest } from '@marketplace/contracts/models/review/review';
import { createReviewRequestSchema } from '@marketplace/contracts/models/review/review';
import { ZodValidationPipe } from '@modules/common/pipes/zod-validation.pipe';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('products/:id/reviews')
  @UseGuards(JwtGatewayGuard)
  @UsePipes(new ZodValidationPipe(createReviewRequestSchema))
  async createReview(@Param('id') productId: string, @Req() request: GatewayRequest, body: CreateReviewRequest): Promise<ReviewResponse> {
    return this.reviewsService.createReview(productId, request.user!.id, body);
  }

  @Get('products/:id/reviews')
  async getReviews(@Param('id') productId: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string): Promise<{ reviews: ReviewResponse[]; nextCursor?: string }> {
    return this.reviewsService.getReviews(productId, cursor, limit ? parseInt(limit, 10) : 20);
  }

  @Get('products/:id/rating')
  async getRating(@Param('id') productId: string): Promise<ProductRating> {
    const rating = await this.reviewsService.getRating(productId);
    if (!rating) {
      return { avg: 0, count: 0 };
    }
    return rating;
  }

  @Delete('reviews/:id')
  @UseGuards(JwtGatewayGuard)
  async deleteReview(@Param('id') reviewId: string, @Req() request: GatewayRequest): Promise<void> {
    await this.reviewsService.deleteReview(reviewId, request.user!.id);
  }
}
