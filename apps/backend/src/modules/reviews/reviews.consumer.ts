import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ReviewsService } from './reviews.service';
import { OrderCompletedEvent } from '../orders/events/order.completed.event';
import { EventIdempotencyService } from '@modules/common/event-idempotency.service';

@Controller()
export class ReviewsConsumer {
  private readonly logger = new Logger(ReviewsConsumer.name);

  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly idempotency: EventIdempotencyService,
  ) { }

  @EventPattern('order.completed')
  async onOrderCompleted(@Payload() event: OrderCompletedEvent, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed order.completed [${event.correlationId}] for order ${event.payload.orderId}`);
    try {
      if (await this.idempotency.isProcessed('reviews', event.eventId)) {
        await this.idempotency.ack(context.getChannelRef(), context.getMessage());
        return;
      }
      for (const item of event.payload.items) {
        await this.reviewsService.onOrderCompleted(item.productId, event.payload.buyerId, event.payload.orderId);
      }
      await this.idempotency.markProcessed('reviews', event.eventId, 'order.completed');
      await this.idempotency.ack(context.getChannelRef(), context.getMessage());
    } catch (error) {
      // do not release claim here; using markProcessed after successful work
      this.logger.error(`Failed to record purchase for order ${event.payload.orderId}: ${error}`);
      await this.idempotency.nack(context.getChannelRef(), context.getMessage(), true);
    }
  }
}
