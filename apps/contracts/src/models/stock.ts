import { z } from 'zod';
import { uuidV4Schema } from '../common/id';

export const stockSchema = z.object({
  productId: uuidV4Schema,
  onHand: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
});

export type Stock = z.infer<typeof stockSchema>;

export const reservationSchema = z.object({
  sagaId: z.string().uuid(),
  productId: z.string().uuid(),
  qty: z.number().int().positive(),
  expiresAt: z.coerce.date(),
});

export type Reservation = z.infer<typeof reservationSchema>;
