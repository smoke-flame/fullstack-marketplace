import { Injectable } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { OrderSagaOrchestrator } from './saga/order-saga.orchestrator';

@Injectable()
export class OrderConsumer {
  constructor(
    private readonly sagaOrchestrator: OrderSagaOrchestrator,
  ) {}

  @EventPattern('inventory.reserved')
  async onInventoryReserved(event: { payload: { orderId: string }; correlationId: string }) {
    await this.sagaOrchestrator.handleInventoryReserved(event.payload.orderId);
  }

  @EventPattern('inventory.rejected')
  async onInventoryRejected(event: { payload: { orderId: string }; correlationId: string }) {
    await this.sagaOrchestrator.handleInventoryRejected(event.payload.orderId);
  }

  @EventPattern('payment.succeeded')
  async onPaymentSucceeded(event: { payload: { orderId: string }; correlationId: string }) {
    await this.sagaOrchestrator.handlePaymentSucceeded(event.payload.orderId);
  }

  @EventPattern('payment.failed')
  async onPaymentFailed(event: { payload: { orderId: string }; correlationId: string }) {
    await this.sagaOrchestrator.handlePaymentFailed(event.payload.orderId);
  }

  @EventPattern('notification.sent')
  async onNotificationSent(event: { payload: { orderId: string }; correlationId: string }) {
    await this.sagaOrchestrator.handleNotificationSent(event.payload.orderId);
  }

  @EventPattern('payment.refunded')
  async onPaymentRefunded(event: { payload: { orderId: string }; correlationId: string }) {
    await this.sagaOrchestrator.handleLateResponse(event.payload.orderId);
  }
}
