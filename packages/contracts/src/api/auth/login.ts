import { z } from 'zod';
import { userRoleSchema, UserRole } from '../../models/user';

export const loginUserRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginUserRequest = z.infer<typeof loginUserRequestSchema>;

export const registerUserRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  roles: z.array(userRoleSchema).min(1).default([UserRole.BUYER]),
});

export type RegisterUserRequest = z.infer<typeof registerUserRequestSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    roles: z.array(userRoleSchema),
  }),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
