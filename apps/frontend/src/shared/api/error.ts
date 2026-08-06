import { apiErrorSchema, type ApiError } from '@marketplace/contracts/errors/gateway';

/** Parse API failures before switching on `error.code`; never use text as application logic. */
export function parseApiError(value: unknown): ApiError | null {
  const parsed = apiErrorSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
