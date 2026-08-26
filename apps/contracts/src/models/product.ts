import { z } from 'zod';
import { productStatusSchema } from './productStatus';
import { uuidV4Schema } from '../common/id';

export const productSchema = z.object({
  id: z.string().uuid(),
  sellerId: uuidV4Schema,
  categoryId: uuidV4Schema,
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  price: z.number().int().positive(),
  status: productStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Product = z.infer<typeof productSchema>;
