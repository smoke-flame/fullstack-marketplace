import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { OrderRepository, ORDER_REPOSITORY } from '../repositories/order.repository';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';
import { PaymentRefundCommand } from '../commands/payment-refund.command';
import { InventoryReleaseCommand } from '../commands/inventory-release.command';
import { InventoryReserveCommand } from '../commands/inventory-reserve.command';
import { PaymentChargeCommand } from '../commands/payment-charge.command';
import { OrderCancelledEvent } from '../events/order.cancelled.event';
import { OrderCompletedEvent } from '../events/order.completed.event';
import { OrderNotCancellableException, OrderNotFoundException } from '@modules/common/errors/order-errors';
import { type OrderItem } from '@marketplace/contracts/models/order';
import { env } from '@config/env';
import { PrismaService } from '@modules/prisma/prisma.service';

interface PendingSaga {
  timeout: NodeJS.Timeout;
  correlationId: string;
  step: string;
}

@Injectable()
export class OrderSagaOrchestrator implements OnModuleInit {
  private readonly logger = new Logger(OrderSagaOrchestrator.name);
  private readonly pendingSagas = new Map<string, PendingSaga>();

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepo: OrderRepository,
    private readonly publisher: EventPublisher,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    const states = await this.prisma.sagaState.findMany();
    for (const state of states) {
      const delay = Math.max(0, state.timeoutAt.getTime() - Date.now());
      const timeout = setTimeout(() => this.handleStepTimeout(state.orderId).catch((error) =>
        this.logger.error(`Recovered saga timeout failed for ${state.orderId}: ${error}`),
      ), delay);
      this.pendingSagas.set(state.orderId, { timeout, correlationId: state.correlationId, step: state.step });
      await this.resumeSaga(state.orderId, state.step, state.correlationId);
    }
    if (states.length) this.logger.log(`Recovered ${states.length} active saga(s) from the database`);
  }

  async startSaga(orderId: string, items: Array<{ productId: string; qty: number }>, correlationId: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.status !== 'PENDING') {
      this.logger.log(`Ignoring order.created replay for ${orderId}; current status is ${order?.status ?? 'missing'}`);
      return;
    }
    const pending = {
      timeout: this.setTimeout(orderId),
      correlationId,
      step: 'RESERVE_INVENTORY',
    };
    if (!await this.createPending(orderId, pending)) {
      clearTimeout(pending.timeout);
      this.logger.log(`Ignoring order.created replay for active saga ${orderId}`);
      return;
    }
    this.logger.log(`Saga started [${correlationId}] for order ${orderId}`);

    await this.publisher.publish(new InventoryReserveCommand({
      sagaId: orderId,
      items,
    }, correlationId));
  }

  async handleInventoryReserved(orderId: string, correlationId: string): Promise<void> {
    const pending = this.pendingSagas.get(orderId) ?? this.recoverPending(orderId, correlationId, 'CHARGE_PAYMENT');

    this.clearTimeout(orderId);
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.status !== 'PENDING') return;

    this.logger.log(`Saga inventory reserved [${pending.correlationId}] for order ${orderId}`);

    await this.orderRepo.updateStatus(orderId, 'RESERVED');

    await this.setPending(orderId, {
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

  async handleInventoryRejected(orderId: string, correlationId: string): Promise<void> {
    const pending = this.pendingSagas.get(orderId) ?? this.recoverPending(orderId, correlationId, 'RESERVE_INVENTORY');

    this.clearTimeout(orderId);
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.status !== 'PENDING') return;

    await this.orderRepo.updateStatus(orderId, 'CANCELLED', 'inventory_rejected');
    await this.clearPending(orderId);

    await this.publisher.publish(new OrderCancelledEvent({
      orderId,
      buyerId: order.buyerId,
      reason: 'inventory_rejected',
    }, pending.correlationId));
  }

  async handlePaymentSucceeded(orderId: string, correlationId: string): Promise<void> {
    const pending = this.pendingSagas.get(orderId) ?? this.recoverPending(orderId, correlationId, 'CHARGE_PAYMENT');

    this.clearTimeout(orderId);
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.status !== 'RESERVED') return;

    this.logger.log(`Saga payment succeeded [${pending.correlationId}] for order ${orderId}`);

    await this.orderRepo.updateStatus(orderId, 'COMPLETED');
    await this.clearPending(orderId);

    await this.publisher.publish(new OrderCompletedEvent({
      orderId,
      buyerId: order.buyerId,
      items: order.items.map((item: OrderItem) => ({
        productId: item.productId,
        qty: item.qty,
      })),
    }, pending.correlationId));
  }

  async handlePaymentFailed(orderId: string, correlationId: string): Promise<void> {
    const pending = this.pendingSagas.get(orderId) ?? this.recoverPending(orderId, correlationId, 'CHARGE_PAYMENT');

    this.clearTimeout(orderId);
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.status !== 'RESERVED') return;

    await this.publisher.publish(new InventoryReleaseCommand({
      sagaId: orderId,
    }, pending.correlationId));

    await this.orderRepo.updateStatus(orderId, 'CANCELLED', 'payment_failed');
    await this.clearPending(orderId);

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
    if (!order || order.status !== 'COMPLETED') return;

    await this.clearPending(orderId);
  }

  async handleStepTimeout(orderId: string): Promise<void> {
    const pending = this.pendingSagas.get(orderId);
    if (!pending) return;

    await this.clearPending(orderId);
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

  async handleLateResponse(orderId: string, correlationId: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) return;

    if (order.status === 'CANCELLED') {
      await this.publisher.publish(new PaymentRefundCommand({
        sagaId: orderId,
      }, correlationId));
    }
  }

  async cancelOrder(orderId: string, buyerId: string, correlationId: string): Promise<any> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new OrderNotFoundException();
    }
    if (order.buyerId !== buyerId) {
      throw new OrderNotCancellableException();
    }

    if (order.status === 'PENDING') {
      this.clearTimeout(orderId);
      await this.clearPending(orderId);
      return this.orderRepo.updateStatus(orderId, 'CANCELLED', 'user_cancelled');
    }

    if (order.status === 'RESERVED') {
      this.clearTimeout(orderId);
      await this.clearPending(orderId);

      await this.publisher.publish(new InventoryReleaseCommand({
        sagaId: orderId,
      }, correlationId));

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

  private recoverPending(orderId: string, correlationId: string, step: string): PendingSaga {
    const pending = { timeout: this.setTimeout(orderId), correlationId, step };
    this.pendingSagas.set(orderId, pending);
    this.logger.log(`Recovered saga ${orderId} from persisted order state at step ${step}`);
    return pending;
  }

  private clearTimeout(orderId: string): void {
    const pending = this.pendingSagas.get(orderId);
    if (pending) {
      clearTimeout(pending.timeout);
    }
  }

  private async setPending(orderId: string, pending: PendingSaga): Promise<void> {
    this.pendingSagas.set(orderId, pending);
    await this.prisma.sagaState.upsert({
      where: { orderId },
      create: { orderId, correlationId: pending.correlationId, step: pending.step, timeoutAt: new Date(Date.now() + env.SAGA_STEP_TIMEOUT_MS) },
      update: { correlationId: pending.correlationId, step: pending.step, timeoutAt: new Date(Date.now() + env.SAGA_STEP_TIMEOUT_MS) },
    });
  }

  private async createPending(orderId: string, pending: PendingSaga): Promise<boolean> {
    try {
      await this.prisma.sagaState.create({
        data: { orderId, correlationId: pending.correlationId, step: pending.step, timeoutAt: new Date(Date.now() + env.SAGA_STEP_TIMEOUT_MS) },
      });
      this.pendingSagas.set(orderId, pending);
      return true;
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') return false;
      throw error;
    }
  }

  private async clearPending(orderId: string): Promise<void> {
    this.clearTimeout(orderId);
    this.pendingSagas.delete(orderId);
    await this.prisma.sagaState.deleteMany({ where: { orderId } });
  }

  private async resumeSaga(orderId: string, step: string, correlationId: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      await this.clearPending(orderId);
      return;
    }
    if (step === 'RESERVE_INVENTORY' && order.status === 'PENDING') {
      await this.publisher.publish(new InventoryReserveCommand({
        sagaId: orderId,
        items: order.items.map((item) => ({ productId: item.productId, qty: item.qty })),
      }, correlationId));
      return;
    }
    if (step === 'CHARGE_PAYMENT' && order.status === 'RESERVED') {
      await this.publisher.publish(new PaymentChargeCommand({
        sagaId: orderId,
        amount: order.totalAmount,
        buyerId: order.buyerId,
      }, correlationId));
      return;
    }
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') await this.clearPending(orderId);
  }
}
