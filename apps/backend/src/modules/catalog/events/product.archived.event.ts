import type { ProductArchivedPayload } from '@marketplace/contracts/events/catalog/product-archived';
import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';

export class ProductArchivedEvent extends RabbitMQEvent {
  readonly eventType = RabbitMQEventType.PRODUCT_ARCHIVED;
  readonly payload: ProductArchivedPayload;

  constructor(payload: ProductArchivedPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
