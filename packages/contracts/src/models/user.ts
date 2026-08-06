import { z } from 'zod';
import { userRoleSchema } from './userRole';

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  passwordHash: z.string().optional(),
  roles: z.array(userRoleSchema),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type User = z.infer<typeof userSchema>;

export { UserRole, type UserRole as UserRoleType, userRoleSchema } from './userRole';
