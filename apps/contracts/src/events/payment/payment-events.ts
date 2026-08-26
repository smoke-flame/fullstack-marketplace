import { z } from 'zod';
import { uuidV4Schema } from '../../common/id';

export const paymentSucceededPayloadSchema = z.object({
  sagaId: uuidV4Schema,
  paymentId: uuidV4Schema,
});

export type PaymentSucceededPayload = z.infer<typeof paymentSucceededPayloadSchema>;

export const paymentFailedPayloadSchema = z.object({
  sagaId: uuidV4Schema,
  paymentId: uuidV4Schema,
  reason: z.enum(['INSUFFICIENT_FUNDS', 'PROVIDER_ERROR']),
});

export type PaymentFailedPayload = z.infer<typeof paymentFailedPayloadSchema>;

export const paymentRefundedPayloadSchema = z.object({
  sagaId: uuidV4Schema,
  paymentId: uuidV4Schema,
});

export type PaymentRefundedPayload = z.infer<typeof paymentRefundedPayloadSchema>;
