import { z } from 'zod';
import { config } from 'dotenv';
import path from 'node:path';

config({ path: path.join(__dirname, '..', '..', '.env') });

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
  INTERNAL_API_KEY: z.string().min(1, 'must be set'),
  SAGA_STEP_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  PAYMENT_FAILURE_PROBABILITY: z.coerce.number().min(0).max(1).default(0.2),
  PAYMENT_MIN_DELAY_MS: z.coerce.number().int().positive().default(1000),
  PAYMENT_MAX_DELAY_MS: z.coerce.number().int().positive().default(5000),
  NOTIFICATION_FAILURE_PROBABILITY: z.coerce.number().min(0).max(1).default(0),
  NOTIFICATION_MAX_RETRIES: z.coerce.number().int().positive().default(5),
  NOTIFICATION_RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().default(1000),
});
const result = schema.safeParse(process.env);
if (!result.success) {
  const details = result.error.issues
    .map((issue) => {
      const variable = issue.path.join('.') || 'environment';
      const message = issue.code === 'invalid_type' && issue.received === 'undefined'
        ? 'is required'
        : issue.message;
      return `  - ${variable}: ${message}`;
    })
    .join('\n');
  console.error(`\n[config] Startup aborted: invalid environment configuration.\n[config] Fix apps/backend/.env (or the container environment):\n${details}\n`);
  process.exit(1);
}
export const env = result.data;
