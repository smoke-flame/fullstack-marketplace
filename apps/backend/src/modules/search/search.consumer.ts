import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import {
  RabbitMQEventType,
  QUEUE_SEARCH_PRODUCT_UPDATED,
  QUEUE_SEARCH_PRODUCT_ARCHIVED,
} from '@modules/rabbitmq/rabbitmq.constants';
import { type ProductCreatedPayload } from '@marketplace/contracts/events/catalog/product-created';
import { type ProductUpdatedPayload } from '@marketplace/contracts/events/catalog/product-updated';
import { type ProductArchivedPayload } from '@marketplace/contracts/events/catalog/product-archived';
import { SearchService } from './search.service';
import { EventIdempotencyService } from '@modules/common/event-idempotency.service';

@Controller()
export class SearchConsumer {
  private readonly logger = new Logger(SearchConsumer.name);
  constructor(
    private readonly searchService: SearchService,
    private readonly idempotency: EventIdempotencyService,
  ) { }

  @EventPattern(RabbitMQEventType.PRODUCT_CREATED)
  async onProductCreated(@Payload() event: { eventId: string; payload: ProductCreatedPayload; occurredAt: string; correlationId: string }, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed product.created [${event.correlationId}] for product ${event.payload.productId}`);
    await this.handle(context, event.eventId, 'product.created', () => this.searchService.indexCreated(event.payload, new Date(event.occurredAt)));
  }

  @EventPattern(QUEUE_SEARCH_PRODUCT_UPDATED)
  async onProductUpdated(@Payload() event: { eventId: string; payload: ProductUpdatedPayload; occurredAt: string; correlationId: string }, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed product.updated [${event.correlationId}] for product ${event.payload.productId}`);
    await this.handle(context, event.eventId, 'product.updated', () => this.searchService.indexUpdated(event.payload, new Date(event.occurredAt)));
  }

  @EventPattern(QUEUE_SEARCH_PRODUCT_ARCHIVED)
  async onProductArchived(@Payload() event: { eventId: string; payload: ProductArchivedPayload; correlationId: string }, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed product.archived [${event.correlationId}] for product ${event.payload.productId}`);
    await this.handle(context, event.eventId, 'product.archived', () => this.searchService.indexArchived(event.payload));
  }

  private async handle(context: RmqContext, eventId: string, eventType: string, work: () => Promise<void>): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      if (await this.idempotency.isProcessed('search', eventId)) { await this.idempotency.ack(channel, message); return; }

      await work();
      await this.idempotency.markProcessed('search', eventId, eventType);
      await this.idempotency.ack(channel, message);
    } catch (error) {
      // do not release claim here; using markProcessed after successful work
      this.logger.error(`Search event handling failed: ${error}`);
      await this.idempotency.nack(channel, message, true);
    }
  }
}
