import { z } from 'zod';
import { uuidV4Schema } from '../../common/id';

export const inventoryReservedPayloadSchema = z.object({
  sagaId: uuidV4Schema,
});

export type InventoryReservedPayload = z.infer<typeof inventoryReservedPayloadSchema>;

export const inventoryRejectedPayloadSchema = z.object({
  sagaId: uuidV4Schema,
  shortages: z.array(z.object({
    productId: uuidV4Schema,
    requested: z.number().int().positive(),
    available: z.number().int().nonnegative(),
  })),
});

export type InventoryRejectedPayload = z.infer<typeof inventoryRejectedPayloadSchema>;
