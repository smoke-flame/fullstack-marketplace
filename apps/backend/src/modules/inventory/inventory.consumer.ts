import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Ctx, Payload, RmqContext } from '@nestjs/microservices';
import { InventoryService } from './inventory.service';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';
import { InventoryReservedEvent, InventoryRejectedEvent } from './events/inventory.events';
import { EventIdempotencyService } from '@modules/common/event-idempotency.service';

@Controller()
export class InventoryConsumer {
  private readonly logger = new Logger(InventoryConsumer.name);

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly publisher: EventPublisher,
    private readonly idempotency: EventIdempotencyService,
  ) {}

  @EventPattern('inventory.reserve')
  async onInventoryReserve(@Payload() event: { eventId: string; payload: { sagaId: string; items: Array<{ productId: string; qty: number }> }; correlationId: string }, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed inventory.reserve [${event.correlationId}] for saga ${event.payload.sagaId}`);
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    try {
      if (!await this.idempotency.claim('inventory', event.eventId, 'inventory.reserve')) {
        await channel.ack(originalMessage);
        return;
      }
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
      await this.idempotency.releaseClaim('inventory', event.eventId);
      this.logger.error(`Inventory reserve failed for saga ${event.payload.sagaId}: ${error}`);
      await channel.nack(originalMessage, false, true);
    }
  }

  @EventPattern('inventory.release')
  async onInventoryRelease(@Payload() event: { eventId: string; payload: { sagaId: string }; correlationId: string }, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed inventory.release [${event.correlationId}] for saga ${event.payload.sagaId}`);
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    try {
      if (!await this.idempotency.claim('inventory', event.eventId, 'inventory.release')) {
        await channel.ack(originalMessage);
        return;
      }
      await this.inventoryService.releaseStock(event.payload.sagaId);
      await channel.ack(originalMessage);
    } catch (error) {
      await this.idempotency.releaseClaim('inventory', event.eventId);
      this.logger.error(`Inventory release failed for saga ${event.payload.sagaId}: ${error}`);
      await channel.nack(originalMessage, false, true);
    }
  }

  @EventPattern('order.completed')
  async onOrderCompleted(@Payload() event: { eventId: string; payload: { orderId: string; items: Array<{ productId: string; qty: number }> }; correlationId: string }, @Ctx() context: RmqContext) {
    try {
      if (!await this.idempotency.claim('inventory', event.eventId, 'order.completed')) {
        await context.getChannelRef().ack(context.getMessage());
        return;
      }
      await this.inventoryService.confirmStock(event.payload.orderId, event.payload.items);
      await context.getChannelRef().ack(context.getMessage());
    } catch (error) {
      await this.idempotency.releaseClaim('inventory', event.eventId);
      this.logger.error(`Inventory confirmation failed for order ${event.payload.orderId}: ${error}`);
      await context.getChannelRef().nack(context.getMessage(), false, true);
    }
  }
}
