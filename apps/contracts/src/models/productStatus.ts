import { z } from 'zod';

export const productStatusSchema = z.enum(['ACTIVE', 'ARCHIVED']);
export type ProductStatus = z.infer<typeof productStatusSchema>;
