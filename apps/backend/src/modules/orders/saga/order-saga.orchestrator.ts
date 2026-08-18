import { Injectable, Inject, Logger } from '@nestjs/common';
import { OrderRepository, ORDER_REPOSITORY } from '../repositories/order.repository';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';
import { PaymentRefundCommand } from '../commands/payment-refund.command';
import { InventoryReleaseCommand } from '../commands/inventory-release.command';
import { InventoryReserveCommand } from '../commands/inventory-reserve.command';
import { PaymentChargeCommand } from '../commands/payment-charge.command';
import { NotificationSendCommand } from '../commands/notification-send.command';
import { OrderCancelledEvent } from '../events/order.cancelled.event';
import { OrderCompletedEvent } from '../events/order.completed.event';
import { OrderNotCancellableException, OrderNotFoundException } from '@modules/common/errors/order-errors';
import { type OrderItem } from '@marketplace/contracts/models/order';
import { env } from '@config/env';

interface PendingSaga {
  timeout: NodeJS.Timeout;
  correlationId: string;
  step: string;
}

@Injectable()
export class OrderSagaOrchestrator {
  private readonly logger = new Logger(OrderSagaOrchestrator.name);
  private readonly pendingSagas = new Map<string, PendingSaga>();

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepo: OrderRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async startSaga(orderId: string, items: Array<{ productId: string; qty: number }>, correlationId: string): Promise<void> {
    this.pendingSagas.set(orderId, {
      timeout: this.setTimeout(orderId),
      correlationId,
      step: 'RESERVE_INVENTORY',
    });

    await this.publisher.publish(new InventoryReserveCommand({
      sagaId: orderId,
      items,
    }, correlationId));
  }

  async handleInventoryReserved(orderId: string): Promise<void> {
    const pending = this.pendingSagas.get(orderId);
    if (!pending) return;

    this.clearTimeout(orderId);
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.status !== 'PENDING') return;

    await this.orderRepo.updateStatus(orderId, 'RESERVED');

    this.pendingSagas.set(orderId, {
      timeout: this.setTimeout(orderId),
      correlationId: pending.correlationId,
      step: 'CHARGE_PAYMENT',
    });

    await this.publisher.publish(new PaymentChargeCommand({
      sagaId: orderId,
      amount: order.totalAmount,
      buyerId: order.buyerId,
    }, pending.correlationId));
  }

  async handleInventoryRejected(orderId: string): Promise<void> {
    const pending = this.pendingSagas.get(orderId);
    if (!pending) return;

    this.clearTimeout(orderId);
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.status !== 'PENDING') return;

    await this.orderRepo.updateStatus(orderId, 'CANCELLED', 'inventory_rejected');
    this.pendingSagas.delete(orderId);

    await this.publisher.publish(new OrderCancelledEvent({
      orderId,
      buyerId: order.buyerId,
      reason: 'inventory_rejected',
    }, pending.correlationId));
  }

  async handlePaymentSucceeded(orderId: string): Promise<void> {
    const pending = this.pendingSagas.get(orderId);
    if (!pending) return;

    this.clearTimeout(orderId);
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.status !== 'RESERVED') return;

    await this.orderRepo.updateStatus(orderId, 'PAID');

    this.pendingSagas.set(orderId, {
      timeout: this.setTimeout(orderId),
      correlationId: pending.correlationId,
      step: 'SEND_NOTIFICATION',
    });

    await this.publisher.publish(new NotificationSendCommand({
      orderId,
      userId: order.buyerId,
    }, pending.correlationId));
  }

  async handlePaymentFailed(orderId: string): Promise<void> {
    const pending = this.pendingSagas.get(orderId);
    if (!pending) return;

    this.clearTimeout(orderId);
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.status !== 'RESERVED') return;

    await this.publisher.publish(new InventoryReleaseCommand({
      sagaId: orderId,
    }, pending.correlationId));

    await this.orderRepo.updateStatus(orderId, 'CANCELLED', 'payment_failed');
    this.pendingSagas.delete(orderId);

    await this.publisher.publish(new OrderCancelledEvent({
      orderId,
      buyerId: order.buyerId,
      reason: 'payment_failed',
    }, pending.correlationId));
  }

  async handleNotificationSent(orderId: string): Promise<void> {
    const pending = this.pendingSagas.get(orderId);
    if (!pending) return;

    this.clearTimeout(orderId);
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.status !== 'PAID') return;

    await this.orderRepo.updateStatus(orderId, 'COMPLETED');
    this.pendingSagas.delete(orderId);

    await this.publisher.publish({
      eventType: RabbitMQEventType.ORDER_COMPLETED,
      payload: {
        orderId,
        buyerId: order.buyerId,
        items: order.items.map((item: OrderItem) => ({
          productId: item.productId,
          qty: item.qty,
        })),
      },
      correlationId: pending.correlationId,
    } as any);
  }

  async handleStepTimeout(orderId: string): Promise<void> {
    const pending = this.pendingSagas.get(orderId);
    if (!pending) return;

    this.pendingSagas.delete(orderId);
    const order = await this.orderRepo.findById(orderId);
    if (!order) return;

    const step = pending.step;

    if (step === 'SEND_NOTIFICATION') {
      await this.orderRepo.updateStatus(orderId, 'COMPLETED');
      await this.publisher.publish(new OrderCompletedEvent({
        orderId,
        buyerId: order.buyerId,
        items: order.items.map((item: OrderItem) => ({
          productId: item.productId,
          qty: item.qty,
        })),
      }, pending.correlationId));
      return;
    }

    const reason = `${step.toLowerCase()}_timeout` as 'inventory_timeout' | 'payment_timeout' | 'notification_timeout';

    if (order.status === 'PENDING') {
      await this.orderRepo.updateStatus(orderId, 'CANCELLED', reason);
      await this.publisher.publish(new OrderCancelledEvent({
        orderId,
        buyerId: order.buyerId,
        reason,
      }, pending.correlationId));
    } else if (order.status === 'RESERVED') {
      await this.publisher.publish(new InventoryReleaseCommand({
        sagaId: orderId,
      }, pending.correlationId));

      await this.orderRepo.updateStatus(orderId, 'CANCELLED', reason);
      await this.publisher.publish(new OrderCancelledEvent({
        orderId,
        buyerId: order.buyerId,
        reason,
      }, pending.correlationId));
    }
  }

  async handleLateResponse(orderId: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) return;

    if (order.status === 'CANCELLED') {
      await this.publisher.publish(new PaymentRefundCommand({
        sagaId: orderId,
      }, ''));
    }
  }

  async cancelOrder(orderId: string, buyerId: string): Promise<any> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new OrderNotFoundException();
    }
    if (order.buyerId !== buyerId) {
      throw new OrderNotCancellableException();
    }

    if (order.status === 'PENDING') {
      this.clearTimeout(orderId);
      this.pendingSagas.delete(orderId);
      return this.orderRepo.updateStatus(orderId, 'CANCELLED', 'user_cancelled');
    }

    if (order.status === 'RESERVED') {
      this.clearTimeout(orderId);
      this.pendingSagas.delete(orderId);

      await this.publisher.publish(new InventoryReleaseCommand({
        sagaId: orderId,
      }, ''));

      return this.orderRepo.updateStatus(orderId, 'CANCELLED', 'user_cancelled');
    }

    throw new OrderNotCancellableException();
  }

  private setTimeout(orderId: string): NodeJS.Timeout {
    return setTimeout(() => {
      this.handleStepTimeout(orderId).catch((error) => {
        this.logger.error(`Saga timeout handler failed for order ${orderId}: ${error}`);
      });
    }, env.SAGA_STEP_TIMEOUT_MS);
  }

  private clearTimeout(orderId: string): void {
    const pending = this.pendingSagas.get(orderId);
    if (pending) {
      clearTimeout(pending.timeout);
    }
  }
}
