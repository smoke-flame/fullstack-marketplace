import { z } from 'zod';

export const paymentStatusSchema = z.enum(['PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED']);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const paymentResponseSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  buyerId: z.string().uuid(),
  amount: z.number().int().positive(),
  status: paymentStatusSchema,
  reason: z.enum(['INSUFFICIENT_FUNDS', 'PROVIDER_ERROR']).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type PaymentResponse = z.infer<typeof paymentResponseSchema>;
