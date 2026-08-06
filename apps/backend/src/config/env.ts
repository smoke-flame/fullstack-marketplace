import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  REDIS_URL: z.string().url(),
  RABBITMQ_URL: z.string().url(),
  INTERNAL_CALL_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_AUTH_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_CATALOG_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_CATALOG_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
});
const result = schema.safeParse(process.env);
if (!result.success) {
  const details = result.error.issues
    .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`\nConfiguration error — update apps/backend/.env:\n${details}\n`);
  process.exit(1);
}
export const env = result.data;
