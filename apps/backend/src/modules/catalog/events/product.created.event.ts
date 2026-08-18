import type { ProductCreatedPayload } from '@marketplace/contracts/events/catalog/product-created';
import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';

export class ProductCreatedEvent extends RabbitMQEvent {
  readonly eventType = RabbitMQEventType.PRODUCT_CREATED;
  readonly payload: ProductCreatedPayload;

  constructor(payload: ProductCreatedPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
