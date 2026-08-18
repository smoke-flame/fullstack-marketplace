import { z } from 'zod';
import { uuidV4Schema } from '../../common/id';
import { orderItemSchema } from '../../api/orders/orders';

export const orderCreatedPayloadSchema = z.object({
  orderId: uuidV4Schema,
  buyerId: uuidV4Schema,
  items: z.array(orderItemSchema),
  totalAmount: z.number().int().positive(),
});

export type OrderCreatedPayload = z.infer<typeof orderCreatedPayloadSchema>;

export const orderCompletedPayloadSchema = z.object({
  orderId: uuidV4Schema,
  buyerId: uuidV4Schema,
  items: z.array(z.object({
    productId: uuidV4Schema,
    qty: z.number().int().positive(),
  })),
});

export type OrderCompletedPayload = z.infer<typeof orderCompletedPayloadSchema>;

export const orderCancelledPayloadSchema = z.object({
  orderId: uuidV4Schema,
  buyerId: uuidV4Schema,
  reason: z.enum(['payment_failed', 'inventory_rejected', 'user_cancelled', 'payment_timeout', 'inventory_timeout', 'notification_timeout']),
});

export type OrderCancelledPayload = z.infer<typeof orderCancelledPayloadSchema>;
