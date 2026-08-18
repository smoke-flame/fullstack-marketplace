import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';

export class NotificationSentEvent extends RabbitMQEvent {
  readonly eventType = RabbitMQEventType.NOTIFICATION_SENT;
  readonly payload: { orderId: string };

  constructor(payload: { orderId: string }, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
