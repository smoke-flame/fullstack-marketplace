import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';
import { type OrderCompletedPayload } from '@marketplace/contracts/events/order/order-events';

export class OrderCompletedEvent extends RabbitMQEvent {
  readonly eventType = RabbitMQEventType.ORDER_COMPLETED;
  readonly payload: OrderCompletedPayload;

  constructor(payload: OrderCompletedPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
