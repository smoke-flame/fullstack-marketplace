import { z } from 'zod';
import { uuidV4Schema } from '../../common/id';

export const cartItemSnapshotSchema = z.object({
  title: z.string().min(1).max(200),
  price: z.number().int().positive(),
});

export type CartItemSnapshot = z.infer<typeof cartItemSnapshotSchema>;

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().positive().max(99),
  snapshot: cartItemSnapshotSchema,
  priceChanged: z.boolean(),
  unavailable: z.boolean(),
});

export type CartItem = z.infer<typeof cartItemSchema>;

export const cartResponseSchema = z.object({
  items: z.array(cartItemSchema),
});

export type CartResponse = z.infer<typeof cartResponseSchema>;
