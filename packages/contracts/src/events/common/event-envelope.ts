import { uuidV4Schema } from '../../common/id';
import { z } from 'zod';

export const eventEnvelopeSchema = z.object({
  id: uuidV4Schema,
  type: z.string().min(1),
  occurredAt: z.coerce.date(),
  correlationId: uuidV4Schema,
  payload: z.unknown(),
});
export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

export function createEventSchema<TPayload extends z.ZodTypeAny>(payload: TPayload) {
  return eventEnvelopeSchema.extend({ payload });
}
