import { z } from 'zod';
import { uuidV4Schema } from '../../common/id';

export const productCreatedPayloadSchema = z.object({
  productId: uuidV4Schema,
  sellerId: uuidV4Schema,
  categoryId: uuidV4Schema,
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  price: z.number().int().positive(),
  currency: z.string().min(1).max(3).default('UAH'),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
});

export type ProductCreatedPayload = z.infer<typeof productCreatedPayloadSchema>;
