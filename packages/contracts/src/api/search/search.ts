import { z } from 'zod';
import { uuidV4Schema } from '../../common/id';

export const searchRequestSchema = z.object({
  q: z.string().optional(),
  categoryId: uuidV4Schema.optional(),
  priceMin: z.coerce.number().int().nonnegative().optional(),
  priceMax: z.coerce.number().int().nonnegative().optional(),
  sellerId: uuidV4Schema.optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'createdAt_desc']).default('relevance'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;

export const searchItemSchema = z.object({
  productId: z.string().uuid(),
  title: z.string().min(1).max(200),
  price: z.number().int().positive(),
  categoryId: z.string().uuid(),
  sellerId: z.string().uuid(),
});

export type SearchItem = z.infer<typeof searchItemSchema>;

export const searchResponseSchema = z.object({
  items: z.array(searchItemSchema),
  nextCursor: z.string().optional(),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;
