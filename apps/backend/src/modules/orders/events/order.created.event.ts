import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';
import { type OrderCreatedPayload } from '@marketplace/contracts/events/order/order-events';

export class OrderCreatedEvent extends RabbitMQEvent {
  readonly eventType = RabbitMQEventType.ORDER_CREATED;
  readonly payload: OrderCreatedPayload;

  constructor(payload: OrderCreatedPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
