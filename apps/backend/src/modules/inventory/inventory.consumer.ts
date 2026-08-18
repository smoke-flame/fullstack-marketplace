import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Ctx, RmqContext } from '@nestjs/microservices';
import { InventoryService } from './inventory.service';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';
import { InventoryReservedEvent, InventoryRejectedEvent } from './events/inventory.events';

@Injectable()
export class InventoryConsumer {
  private readonly logger = new Logger(InventoryConsumer.name);

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly publisher: EventPublisher,
  ) {}

  @EventPattern('inventory.reserve')
  async onInventoryReserve(@Ctx() context: RmqContext, event: { payload: { sagaId: string; items: Array<{ productId: string; qty: number }> }; correlationId: string }) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    try {
      const result = await this.inventoryService.reserveStock(event.payload.sagaId, event.payload.items);
      if (result.success) {
        await this.publisher.publish(new InventoryReservedEvent({
          sagaId: event.payload.sagaId,
        }, event.correlationId));
      } else {
        await this.publisher.publish(new InventoryRejectedEvent({
          sagaId: event.payload.sagaId,
          shortages: result.shortages ?? [],
        }, event.correlationId));
      }
      await channel.ack(originalMessage);
    } catch (error) {
      this.logger.error(`Inventory reserve failed for saga ${event.payload.sagaId}: ${error}`);
      await channel.nack(originalMessage, false, false);
    }
  }

  @EventPattern('inventory.release')
  async onInventoryRelease(@Ctx() context: RmqContext, event: { payload: { sagaId: string }; correlationId: string }) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    await this.inventoryService.releaseStock(event.payload.sagaId);
    await channel.ack(originalMessage);
  }

  @EventPattern('order.completed')
  async onOrderCompleted(@Ctx() context: RmqContext, event: { payload: { orderId: string; items: Array<{ productId: string; qty: number }> }; correlationId: string }) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    await this.inventoryService.confirmStock(event.payload.orderId, event.payload.items);
    await channel.ack(originalMessage);
  }
}
