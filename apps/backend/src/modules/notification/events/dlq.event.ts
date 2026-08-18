import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { DLQ_NAME } from '@modules/rabbitmq/rabbitmq.constants';

export class DlqEvent extends RabbitMQEvent {
  readonly eventType = DLQ_NAME;
  readonly payload: Record<string, unknown>;

  constructor(payload: Record<string, unknown>, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
