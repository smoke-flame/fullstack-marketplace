import { z } from 'zod';
const schema = z.object({ NEXT_PUBLIC_API_URL: z.string().url() });
const result = schema.safeParse({ NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL });
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
  throw new Error(`[config] Startup aborted: invalid environment configuration.\n[config] Fix apps/frontend/.env (or the container environment):\n${details}`);
}
export const env = result.data;
