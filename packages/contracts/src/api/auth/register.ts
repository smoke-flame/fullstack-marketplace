import { z } from 'zod';
import { userRoleSchema, UserRole } from '../../models/user';

export const registerUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  roles: z.array(userRoleSchema).min(1).default([UserRole.BUYER]),
});

export type RegisterUserRequest = z.infer<typeof registerUserRequestSchema>;

export const registerUserResponseSchema = z.object({
  userId: z.string().uuid(),
});

export type RegisterUserResponse = z.infer<typeof registerUserResponseSchema>;
