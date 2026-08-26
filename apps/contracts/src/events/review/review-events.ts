import { z } from 'zod';
import { uuidV4Schema } from '../../common/id';

export const reviewCreatedPayloadSchema = z.object({
  reviewId: uuidV4Schema,
  productId: uuidV4Schema,
  buyerId: uuidV4Schema,
  rating: z.number().int().min(1).max(5),
});

export type ReviewCreatedPayload = z.infer<typeof reviewCreatedPayloadSchema>;

export const reviewDeletedPayloadSchema = z.object({
  reviewId: uuidV4Schema,
  productId: uuidV4Schema,
});

export type ReviewDeletedPayload = z.infer<typeof reviewDeletedPayloadSchema>;
