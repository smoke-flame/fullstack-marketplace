import { z } from 'zod';
export const categorySchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  title: z.string().min(1).max(200),
});

export type Category = z.infer<typeof categorySchema>;
