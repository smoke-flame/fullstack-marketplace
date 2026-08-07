import { z } from 'zod';
import { userSchema } from '../../models/user';

export const meResponseSchema = userSchema.pick({
  id: true,
  email: true,
  roles: true,
  createdAt: true,
});

export type MeResponse = z.infer<typeof meResponseSchema>;
