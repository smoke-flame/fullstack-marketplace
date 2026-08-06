import { z } from 'zod';

export const UserRole = {
  BUYER: 'BUYER',
  SELLER: 'SELLER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const userRoleSchema = z.enum(['BUYER', 'SELLER']);
