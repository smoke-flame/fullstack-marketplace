import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQCommandType } from '@modules/rabbitmq/rabbitmq.constants';
import { type NotificationSendCommand as NotificationSendCommandPayload } from '@marketplace/contracts/events/commands';

export class NotificationSendCommand extends RabbitMQEvent {
  readonly eventType = RabbitMQCommandType.NOTIFICATION_SEND;
  readonly payload: NotificationSendCommandPayload;

  constructor(payload: NotificationSendCommandPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
