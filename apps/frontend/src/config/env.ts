import { z } from 'zod';
const schema = z.object({ NEXT_PUBLIC_API_URL: z.string().url() });
const result = schema.safeParse({ NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL });
if (!result.success) {
  const details = result.error.issues.map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Configuration error — update apps/frontend/.env:\n${details}`);
}
export const env = result.data;
