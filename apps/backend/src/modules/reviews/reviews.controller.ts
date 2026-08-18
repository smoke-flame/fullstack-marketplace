import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards, Query } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtGatewayGuard } from '@modules/gateway/guards/jwt-gateway.guard';
import type { GatewayRequest } from '@modules/gateway/middleware/correlation-id.middleware';
import type { ReviewResponse, ProductRating, CreateReviewRequest } from '@marketplace/contracts/models/review/review';
import { createReviewRequestSchema } from '@marketplace/contracts/models/review/review';
import { ZodValidationPipe } from '@modules/common/pipes/zod-validation.pipe';
import { Public } from '@modules/common/decorators/public.decorator';

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
  async getReviews(@Param('id') productId: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string): Promise<{ reviews: ReviewResponse[]; nextCursor?: string }> {
    return this.reviewsService.getReviews(productId, cursor, limit ? parseInt(limit, 10) : 20);
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
