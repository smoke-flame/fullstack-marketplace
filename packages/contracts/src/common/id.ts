import { z } from 'zod';

/** Canonical identifier format used by every application-owned ID. */
export const uuidV4Schema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'must be a UUID v4',
  );
export type UuidV4 = z.infer<typeof uuidV4Schema>;
