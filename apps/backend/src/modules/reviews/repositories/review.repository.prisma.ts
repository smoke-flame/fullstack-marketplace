import { Injectable } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { ReviewRepository } from './review.repository';
import type { Review, ProductRating } from '@marketplace/contracts/models/review/review';

@Injectable()
export class PrismaReviewRepository implements ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { productId: string; buyerId: string; rating: number; text?: string }): Promise<Review> {
    const review = await this.prisma.review.create({
      data: {
        productId: data.productId,
        buyerId: data.buyerId,
        rating: data.rating,
        text: data.text ?? null,
      },
    });
    return this.mapReview(review);
  }

  async findByProductId(productId: string, cursor?: string, limit = 20): Promise<{ reviews: Review[]; nextCursor?: string }> {
    const where: Record<string, unknown> = { productId };
    if (cursor) {
      where.id = { lt: cursor };
    }

    const reviews = await this.prisma.review.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
    });

    const nextCursor = reviews.length > limit ? reviews[reviews.length - 1].id : undefined;
    return {
      reviews: reviews.slice(0, limit).map(this.mapReview),
      nextCursor,
    };
  }

  async findById(reviewId: string): Promise<Review | null> {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    return review ? this.mapReview(review) : null;
  }

  async findByBuyerIdAndProductId(buyerId: string, productId: string): Promise<Review | null> {
    const review = await this.prisma.review.findFirst({
      where: { buyerId, productId },
      orderBy: { createdAt: 'desc' },
    });
    return review ? this.mapReview(review) : null;
  }

  async delete(reviewId: string, buyerId: string): Promise<void> {
    await this.prisma.review.deleteMany({
      where: { id: reviewId, buyerId },
    });
  }

  async getProductRating(productId: string): Promise<ProductRating | null> {
    const rating = await this.prisma.productRating.findUnique({
      where: { productId },
    });
    if (!rating) return null;
    return {
      avg: Number(rating.avgRating),
      count: rating.reviewCount,
    };
  }

  async upsertProductRating(productId: string): Promise<ProductRating> {
    const result = await this.prisma.$queryRaw<{ productId: string; avg: number; count: number }[]>`
      SELECT "productId" as "productId", ROUND(AVG(rating)::numeric, 1) as "avg", COUNT(*) as "count"
      FROM "Review"
      WHERE "productId" = ${productId}
      GROUP BY "productId"
    `;

    const row = result[0];
    if (!row) {
      const rating = await this.prisma.productRating.upsert({
        where: { productId },
        create: { productId, avgRating: 0, reviewCount: 0 },
        update: { avgRating: 0, reviewCount: 0 },
      });
      return { avg: Number(rating.avgRating), count: rating.reviewCount };
    }

    const avg = Number(Number(row.avg).toFixed(1));
    const count = Number(row.count);
    const rating = await this.prisma.productRating.upsert({
      where: { productId },
      create: { productId, avgRating: avg, reviewCount: count },
      update: { avgRating: avg, reviewCount: count },
    });

    return { avg: Number(rating.avgRating), count: rating.reviewCount };
  }

  async recordPurchase(data: { productId: string; buyerId: string; orderId: string }): Promise<void> {
    await this.prisma.purchase.upsert({
      where: { buyerId_productId: { buyerId: data.buyerId, productId: data.productId } },
      create: {
        buyerId: data.buyerId,
        productId: data.productId,
        orderId: data.orderId,
      },
      update: {},
    });
  }

  async hasPurchased(productId: string, buyerId: string): Promise<boolean> {
    const purchase = await this.prisma.purchase.findFirst({
      where: { buyerId, productId },
    });
    return !!purchase;
  }

  private mapReview(review: {
    id: string;
    productId: string;
    buyerId: string;
    rating: number;
    text: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Review {
    return {
      id: review.id,
      productId: review.productId,
      buyerId: review.buyerId,
      rating: review.rating,
      text: review.text ?? undefined,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
