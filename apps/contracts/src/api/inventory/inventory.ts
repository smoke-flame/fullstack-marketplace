import { z } from 'zod';
import { uuidV4Schema } from '../../common/id';

export const stockResponseSchema = z.object({
  productId: uuidV4Schema,
  onHand: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
});

export type StockResponse = z.infer<typeof stockResponseSchema>;

export const setStockRequestSchema = z.object({
  onHand: z.number().int().nonnegative(),
});

export type SetStockRequest = z.infer<typeof setStockRequestSchema>;

export const batchStockRequestSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export type BatchStockRequest = z.infer<typeof batchStockRequestSchema>;

export const batchStockResponseSchema = z.object({
  stocks: z.array(stockResponseSchema),
  missing: z.array(z.string().uuid()),
});

export type BatchStockResponse = z.infer<typeof batchStockResponseSchema>;
