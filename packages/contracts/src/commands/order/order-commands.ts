import { z } from 'zod';
import { uuidV4Schema } from '../../common/id';

export const inventoryReserveCommandSchema = z.object({
  orderId: uuidV4Schema,
  items: z.array(z.object({
    productId: uuidV4Schema,
    qty: z.number().int().positive(),
  })),
});

export type InventoryReserveCommand = z.infer<typeof inventoryReserveCommandSchema>;

export const inventoryReleaseCommandSchema = z.object({
  orderId: uuidV4Schema,
});

export type InventoryReleaseCommand = z.infer<typeof inventoryReleaseCommandSchema>;

export const paymentChargeCommandSchema = z.object({
  orderId: uuidV4Schema,
  amount: z.number().int().positive(),
  buyerId: uuidV4Schema,
});

export type PaymentChargeCommand = z.infer<typeof paymentChargeCommandSchema>;

export const paymentRefundCommandSchema = z.object({
  orderId: uuidV4Schema,
  amount: z.number().int().positive(),
});

export type PaymentRefundCommand = z.infer<typeof paymentRefundCommandSchema>;

export const notificationSendCommandSchema = z.object({
  orderId: uuidV4Schema,
  buyerId: uuidV4Schema,
});

export type NotificationSendCommand = z.infer<typeof notificationSendCommandSchema>;
