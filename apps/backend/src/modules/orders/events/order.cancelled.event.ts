import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';
import { type OrderCancelledPayload } from '@marketplace/contracts/events/order/order-events';

export class OrderCancelledEvent extends RabbitMQEvent {
  readonly eventType = RabbitMQEventType.ORDER_CANCELLED;
  readonly payload: OrderCancelledPayload;

  constructor(payload: OrderCancelledPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
