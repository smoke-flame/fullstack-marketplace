import { z } from 'zod';
import { uuidV4Schema } from '../common/id';

export const orderStatusSchema = z.enum([
  'PENDING',
  'RESERVED',
  'PAID',
  'COMPLETED',
  'CANCELLED',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderTimelineEntrySchema = z.object({
  status: orderStatusSchema,
  occurredAt: z.coerce.date(),
  reason: z.enum(['payment_failed', 'inventory_rejected', 'user_cancelled', 'payment_timeout', 'inventory_timeout']).nullable(),
});
export type OrderTimelineEntry = z.infer<typeof orderTimelineEntrySchema>;

export const orderItemSchema = z.object({
  productId: uuidV4Schema,
  qty: z.number().int().positive().max(99),
  price: z.number().int().positive(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;
