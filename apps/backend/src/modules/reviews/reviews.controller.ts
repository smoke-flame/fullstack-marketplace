import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards, Query } from '@nestjs/common';
import { z } from 'zod';
import { ReviewsService } from './reviews.service';
import { JwtGatewayGuard } from '@modules/gateway/guards/jwt-gateway.guard';
import { Public } from '@modules/common/decorators/public.decorator';
import { ZodValidationPipe } from '@modules/common/pipes/zod-validation.pipe';
import type { GatewayRequest } from '@modules/gateway/middleware/correlation-id.middleware';
import type { ReviewResponse, ProductRating, CreateReviewRequest } from '@marketplace/contracts/models/review/review';
import { createReviewRequestSchema } from '@marketplace/contracts/models/review/review';
import type { PaginatedReviewsResponse } from '@marketplace/contracts/models/review/review';

const getReviewsQuerySchema = z.object({
  limit: z.coerce.number().int().min(20).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

type GetReviewsQuery = z.infer<typeof getReviewsQuerySchema>;

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('products/:id/reviews')
  @UseGuards(JwtGatewayGuard)
  async createReview(
    @Param('id') productId: string,
    @Req() request: GatewayRequest,
    @Body(new ZodValidationPipe(createReviewRequestSchema)) body: CreateReviewRequest,
  ): Promise<ReviewResponse> {
    return this.reviewsService.createReview(productId, request.user!.id, body);
  }

  @Get('products/:id/reviews')
  @Public()
  async getReviews(@Param('id') productId: string, @Query(new ZodValidationPipe(getReviewsQuerySchema)) query: GetReviewsQuery): Promise<PaginatedReviewsResponse> {
    return this.reviewsService.getReviews(productId, query.limit, query.offset);
  }

  @Get('products/:id/rating')
  @Public()
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
