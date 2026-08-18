import { z } from 'zod';
import { uuidV4Schema } from '../../common/id';

export const productArchivedPayloadSchema = z.object({
  productId: uuidV4Schema,
});

export type ProductArchivedPayload = z.infer<typeof productArchivedPayloadSchema>;
