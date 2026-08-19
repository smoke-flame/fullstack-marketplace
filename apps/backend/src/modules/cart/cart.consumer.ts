import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';
import { CartService } from './cart.service';
import type { ProductUpdatedPayload } from '@marketplace/contracts/events/catalog/product-updated';
import type { ProductArchivedPayload } from '@marketplace/contracts/events/catalog/product-archived';
import { EventIdempotencyService } from '@modules/common/event-idempotency.service';

@Controller()
export class CartConsumer {
  private readonly logger = new Logger(CartConsumer.name);
  constructor(
    private readonly cartService: CartService,
    private readonly idempotency: EventIdempotencyService,
  ) { }

  @EventPattern(RabbitMQEventType.PRODUCT_UPDATED)
  async onProductUpdated(@Payload() event: { eventId: string; payload: ProductUpdatedPayload; correlationId: string }, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed product.updated [${event.correlationId}] for product ${event.payload.productId}`);
    await this.handle(context, event.eventId, 'product.updated', () => this.cartService.invalidateSnapshotByProductId(event.payload.productId, event.payload.price, event.payload.status === 'ARCHIVED'));
  }

  @EventPattern(RabbitMQEventType.PRODUCT_ARCHIVED)
  async onProductArchived(@Payload() event: { eventId: string; payload: ProductArchivedPayload; correlationId: string }, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed product.archived [${event.correlationId}] for product ${event.payload.productId}`);
    await this.handle(context, event.eventId, 'product.archived', () => this.cartService.invalidateSnapshotByProductId(event.payload.productId, undefined, true));
  }

  private async handle(context: RmqContext, eventId: string, eventType: string, work: () => Promise<void>): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      if (await this.idempotency.isProcessed('cart', eventId)) { await this.idempotency.ack(channel, message); return; }

      await work();
      await this.idempotency.markProcessed('cart', eventId, eventType);
      await this.idempotency.ack(channel, message);
    } catch (error) {
      // do not release claim here; using markProcessed after successful work
      this.logger.error(`Cart event handling failed: ${error}`);
      await this.idempotency.nack(channel, message, true);
    }
  }
}
