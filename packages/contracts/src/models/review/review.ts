import { z } from 'zod';
import { uuidV4Schema } from '../../common/id';

export const reviewSchema = z.object({
  id: z.string().uuid(),
  productId: uuidV4Schema,
  buyerId: uuidV4Schema,
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Review = z.infer<typeof reviewSchema>;

export const reviewResponseSchema = reviewSchema;

export type ReviewResponse = z.infer<typeof reviewResponseSchema>;

export const createReviewRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional(),
});

export type CreateReviewRequest = z.infer<typeof createReviewRequestSchema>;

export const productRatingSchema = z.object({
  avg: z.number().min(1).max(5),
  count: z.number().int().nonnegative(),
});

export type ProductRating = z.infer<typeof productRatingSchema>;
