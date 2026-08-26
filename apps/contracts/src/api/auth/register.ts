import { z } from 'zod';
import { UserRole } from '../../models/user';

const registerableRoleSchema = z.enum([UserRole.BUYER, UserRole.SELLER]);

export const registerUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  roles: z.array(registerableRoleSchema).min(1).default([UserRole.BUYER]),
});

export type RegisterUserRequest = z.infer<typeof registerUserRequestSchema>;

export const registerUserResponseSchema = z.object({
  userId: z.string().uuid(),
});

export type RegisterUserResponse = z.infer<typeof registerUserResponseSchema>;
