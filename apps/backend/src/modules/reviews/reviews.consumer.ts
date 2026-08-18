import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Ctx, RmqContext } from '@nestjs/microservices';
import { ReviewsService } from './reviews.service';
import { OrderCompletedEvent } from '../orders/events/order.completed.event';

@Injectable()
export class ReviewsConsumer {
  private readonly logger = new Logger(ReviewsConsumer.name);

  constructor(private readonly reviewsService: ReviewsService) {}

  @EventPattern('order.completed')
  async onOrderCompleted(@Ctx() context: RmqContext, event: OrderCompletedEvent) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    try {
      for (const item of event.payload.items) {
        await this.reviewsService.onOrderCompleted(item.productId, event.payload.buyerId, event.payload.orderId);
      }
      await channel.ack(originalMessage);
    } catch (error) {
      this.logger.error(`Failed to record purchase for order ${event.payload.orderId}: ${error}`);
      await channel.nack(originalMessage, false, false);
    }
  }
}
