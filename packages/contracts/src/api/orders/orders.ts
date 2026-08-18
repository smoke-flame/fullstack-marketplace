import { z } from 'zod';
import { uuidV4Schema } from '../../common/id';
import { orderStatusSchema } from '../../models/order';

export const orderItemSchema = z.object({
  productId: uuidV4Schema,
  qty: z.number().int().positive().max(99),
  price: z.number().int().positive(),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export const createOrderRequestSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(50),
});

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

export const orderResponseSchema = z.object({
  id: z.string().uuid(),
  buyerId: z.string().uuid(),
  status: orderStatusSchema,
  totalAmount: z.number().int().positive(),
  items: z.array(orderItemSchema),
  timeline: z.array(z.object({
    status: orderStatusSchema,
    occurredAt: z.coerce.date(),
    reason: z.string().nullable(),
  })),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type OrderResponse = z.infer<typeof orderResponseSchema>;
