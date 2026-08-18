import { z } from 'zod';
import { uuidV4Schema } from '../../common/id';
import { productStatusSchema } from '../../models/productStatus';

export const createProductRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  price: z.number().int().positive(),
  categoryId: z.string().uuid(),
});

export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;

export const updateProductRequestSchema = createProductRequestSchema.extend({
  status: productStatusSchema.optional(),
}).partial();

export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;

export const batchProductsRequestSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export type BatchProductsRequest = z.infer<typeof batchProductsRequestSchema>;

export const productResponseSchema = z.object({
  id: z.string().uuid(),
  sellerId: z.string().uuid(),
  sellerEmail: z.string().email().optional(),
  categoryId: z.string().uuid(),
  categoryTitle: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullable(),
  price: z.number().int().positive(),
  status: productStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ProductResponse = z.infer<typeof productResponseSchema>;

export const batchProductsResponseSchema = z.object({
  products: z.array(productResponseSchema),
  missing: z.array(z.string().uuid()),
});

export type BatchProductsResponse = z.infer<typeof batchProductsResponseSchema>;
