import { z } from 'zod';
import { uuidV4Schema } from '../../common/id';

export const createCategoryRequestSchema = z.object({
  title: z.string().min(1).max(200),
  parentId: uuidV4Schema.nullable().optional(),
});

export type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>;

export const categoryResponseSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  title: z.string().min(1).max(200),
});

export type CategoryResponse = z.infer<typeof categoryResponseSchema>;
