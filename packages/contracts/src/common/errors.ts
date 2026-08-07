import { z } from 'zod';
import { uuidV4Schema } from '../common/id';

/** Error codes owned by the API gateway module. */
export const gatewayErrorCodes = {
  unauthorized: 'UNAUTHORIZED',
  forbidden: 'FORBIDDEN',
  validationError: 'VALIDATION_ERROR',
  badRequest: 'BAD_REQUEST',
  notFound: 'NOT_FOUND',
  rateLimitExceeded: 'RATE_LIMIT_EXCEEDED',
  serviceUnavailable: 'SERVICE_UNAVAILABLE',
  internalError: 'INTERNAL_ERROR',
} as const;

export type GatewayErrorCode = (typeof gatewayErrorCodes)[keyof typeof gatewayErrorCodes];

export const authErrorCodes = {
  emailTaken: 'auth.EMAIL_TAKEN',
  passwordTooWeak: 'auth.PASSWORD_TOO_WEAK',
  invalidCredentials: 'auth.INVALID_CREDENTIALS',
  refreshTokenInvalid: 'auth.REFRESH_TOKEN_INVALID',
  refreshTokenRevoked: 'auth.REFRESH_TOKEN_REVOKED',
} as const;

export type AuthErrorCode = (typeof authErrorCodes)[keyof typeof authErrorCodes];

export const validationErrorDetailSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
});
export type ValidationErrorDetail = z.infer<typeof validationErrorDetailSchema>;

export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  details: z.array(validationErrorDetailSchema).optional(),
  correlationId: uuidV4Schema,
});
export type ApiError = z.infer<typeof apiErrorSchema>;
