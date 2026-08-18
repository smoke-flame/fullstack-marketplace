import { Injectable } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';
import { type ProductCreatedPayload } from '@marketplace/contracts/events/catalog/product-created';
import { type ProductUpdatedPayload } from '@marketplace/contracts/events/catalog/product-updated';
import { type ProductArchivedPayload } from '@marketplace/contracts/events/catalog/product-archived';
import { SearchService } from './search.service';

@Injectable()
export class SearchConsumer {
  constructor(private readonly searchService: SearchService) {}

  @EventPattern(RabbitMQEventType.PRODUCT_CREATED)
  async onProductCreated(event: { payload: ProductCreatedPayload; occurredAt: string }) {
    return this.searchService.indexCreated(event.payload, new Date(event.occurredAt));
  }

  @EventPattern(RabbitMQEventType.PRODUCT_UPDATED)
  async onProductUpdated(event: { payload: ProductUpdatedPayload; occurredAt: string }) {
    return this.searchService.indexUpdated(event.payload, new Date(event.occurredAt));
  }

  @EventPattern(RabbitMQEventType.PRODUCT_ARCHIVED)
  async onProductArchived(event: { payload: ProductArchivedPayload }) {
    return this.searchService.indexArchived(event.payload);
  }
}
