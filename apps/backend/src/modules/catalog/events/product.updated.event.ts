import type { ProductUpdatedPayload } from '@marketplace/contracts/events/catalog/product-updated';
import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';

export class ProductUpdatedEvent extends RabbitMQEvent {
  readonly eventType = RabbitMQEventType.PRODUCT_UPDATED;
  readonly payload: ProductUpdatedPayload;

  constructor(payload: ProductUpdatedPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
