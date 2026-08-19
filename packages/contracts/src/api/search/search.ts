import { z } from 'zod';
import { uuidV4Schema } from '../../common/id';

export const searchRequestSchema = z.object({
  q: z.string().optional(),
  categoryId: uuidV4Schema.optional(),
  priceMin: z.coerce.number().int().nonnegative().optional(),
  priceMax: z.coerce.number().int().nonnegative().optional(),
  sellerId: uuidV4Schema.optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'createdAt_desc']).default('relevance'),
  limit: z.coerce.number().int().min(20).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;

export type Sort = 'relevance' | 'price_asc' | 'price_desc' | 'createdAt_desc';

export const searchItemSchema = z.object({
  productId: z.string().uuid(),
  title: z.string().min(1).max(200),
  price: z.number().int().positive(),
  currency: z.string().min(1).max(3).default('UAH'),
  categoryId: z.string().uuid(),
  sellerId: z.string().uuid(),
  categoryTitle: z.string().min(1),
  sellerEmail: z.string().min(1),
});

export type SearchItem = z.infer<typeof searchItemSchema>;

export const searchResponseSchema = z.object({
  items: z.array(searchItemSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().min(20).max(100),
  offset: z.number().int().nonnegative(),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;
