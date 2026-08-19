import { RabbitMQEvent } from './rabbitmq.event';
import { DLQ_NAME } from './rabbitmq.constants';
import type { BaseDlqPayload } from './dlq.types';

export type DlqPayload<TOriginal = unknown> = BaseDlqPayload<string, TOriginal>;

export class DlqEvent<TPayload = DlqPayload> extends RabbitMQEvent {
  readonly eventType = DLQ_NAME;
  readonly payload: TPayload;

  constructor(payload: TPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
