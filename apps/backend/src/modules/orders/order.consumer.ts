import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Ctx, Payload, RmqContext } from '@nestjs/microservices';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';
import { OrderSagaOrchestrator } from './saga/order-saga.orchestrator';
import { EventIdempotencyService } from '@modules/common/event-idempotency.service';

@Controller()
export class OrderConsumer {
  private readonly logger = new Logger(OrderConsumer.name);
  constructor(
    private readonly sagaOrchestrator: OrderSagaOrchestrator,
    private readonly idempotency: EventIdempotencyService,
  ) {}

  @EventPattern(RabbitMQEventType.ORDER_CREATED)
  async onOrderCreated(
    @Payload() event: { eventId: string; payload: { orderId: string; items: Array<{ productId: string; qty: number }> }; correlationId: string }, @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Consumed ${RabbitMQEventType.ORDER_CREATED} [${event.correlationId}] for order ${event.payload.orderId}`);
    await this.handle(context, event.eventId, RabbitMQEventType.ORDER_CREATED, () => this.sagaOrchestrator.startSaga(event.payload.orderId, event.payload.items, event.correlationId));
  }

  @EventPattern('inventory.reserved')
  async onInventoryReserved(@Payload() event: { eventId: string; payload: { sagaId: string }; correlationId: string }, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed inventory.reserved [${event.correlationId}] for saga ${event.payload.sagaId}`);
    await this.handle(context, event.eventId, RabbitMQEventType.INVENTORY_RESERVED, () => this.sagaOrchestrator.handleInventoryReserved(event.payload.sagaId, event.correlationId));
  }

  @EventPattern('inventory.rejected')
  async onInventoryRejected(@Payload() event: { eventId: string; payload: { sagaId: string }; correlationId: string }, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed inventory.rejected [${event.correlationId}] for saga ${event.payload.sagaId}`);
    await this.handle(context, event.eventId, RabbitMQEventType.INVENTORY_REJECTED, () => this.sagaOrchestrator.handleInventoryRejected(event.payload.sagaId, event.correlationId));
  }

  @EventPattern('payment.succeeded')
  async onPaymentSucceeded(@Payload() event: { eventId: string; payload: { sagaId: string }; correlationId: string }, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed payment.succeeded [${event.correlationId}] for saga ${event.payload.sagaId}`);
    await this.handle(context, event.eventId, RabbitMQEventType.PAYMENT_SUCCEEDED, () => this.sagaOrchestrator.handlePaymentSucceeded(event.payload.sagaId, event.correlationId));
  }

  @EventPattern('payment.failed')
  async onPaymentFailed(@Payload() event: { eventId: string; payload: { sagaId: string }; correlationId: string }, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed payment.failed [${event.correlationId}] for saga ${event.payload.sagaId}`);
    await this.handle(context, event.eventId, RabbitMQEventType.PAYMENT_FAILED, () => this.sagaOrchestrator.handlePaymentFailed(event.payload.sagaId, event.correlationId));
  }

  @EventPattern('notification.sent')
  async onNotificationSent(@Payload() event: { eventId: string; payload: { orderId: string }; correlationId: string }, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed notification.sent [${event.correlationId}] for order ${event.payload.orderId}`);
    await this.handle(context, event.eventId, RabbitMQEventType.NOTIFICATION_SENT, () => this.sagaOrchestrator.handleNotificationSent(event.payload.orderId));
  }

  @EventPattern('payment.refunded')
  async onPaymentRefunded(@Payload() event: { eventId: string; payload: { sagaId: string }; correlationId: string }, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed payment.refunded [${event.correlationId}] for saga ${event.payload.sagaId}`);
    await this.handle(context, event.eventId, RabbitMQEventType.PAYMENT_REFUNDED, () => this.sagaOrchestrator.handleLateResponse(event.payload.sagaId, event.correlationId));
  }

  private async handle(context: RmqContext, eventId: string, eventType: string, work: () => Promise<void>): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      if (!await this.idempotency.claim('orders', eventId, eventType)) {
        await channel.ack(message);
        return;
      }
      await work();
      await channel.ack(message);
    } catch (error) {
      await this.idempotency.releaseClaim('orders', eventId);
      this.logger.error(`Order event handling failed: ${error}`);
      await channel.nack(message, false, true);
    }
  }
}
