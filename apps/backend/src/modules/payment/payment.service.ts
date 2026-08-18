import { Injectable, Inject, Logger } from '@nestjs/common';
import { PaymentRepository, PAYMENT_REPOSITORY } from './repositories/payment.repository';
import { PaymentSucceededEvent, PaymentFailedEvent, PaymentRefundedEvent } from './events';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';
import { type PaymentSucceededPayload, type PaymentFailedPayload, type PaymentRefundedPayload } from '@marketplace/contracts/events/payment/payment-events';
import { env } from '@config/env';
import type { PaymentResponse } from '@marketplace/contracts/models/payment';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly failureProbability: number;
  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;

  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly paymentRepo: PaymentRepository,
    private readonly publisher: EventPublisher,
  ) {
    this.failureProbability = env.PAYMENT_FAILURE_PROBABILITY ?? 0.2;
    this.minDelayMs = env.PAYMENT_MIN_DELAY_MS ?? 1000;
    this.maxDelayMs = env.PAYMENT_MAX_DELAY_MS ?? 5000;
  }

  async processCharge(sagaId: string, amount: number, buyerId: string, correlationId: string): Promise<void> {
    const existing = await this.paymentRepo.findByIdempotentKey(sagaId);
    if (existing) {
      if (existing.status === 'PROCESSING') {
        this.logger.log(`Returning existing payment ${existing.id} for saga ${sagaId} (idempotent)`);
        return;
      }

      if (existing.status === 'SUCCEEDED') {
        this.logger.log(`Returning existing succeeded payment ${existing.id} for saga ${sagaId} (idempotent)`);
        await this.publisher.publish(new PaymentSucceededEvent({
          sagaId,
          paymentId: existing.id,
        } as PaymentSucceededPayload, correlationId));
        return;
      }

      if (existing.status === 'FAILED') {
        this.logger.log(`Returning existing failed payment ${existing.id} for saga ${sagaId}`);
        await this.publisher.publish(new PaymentFailedEvent({
          sagaId,
          paymentId: existing.id,
          reason: existing.reason ?? 'PROVIDER_ERROR',
        } as PaymentFailedPayload, correlationId));
        return;
      }
    }

    const payment = await this.paymentRepo.create({
      orderId: sagaId,
      buyerId,
      amount,
      status: 'PROCESSING',
    });

    const delay = this.randomDelay();
    this.logger.log(`Payment ${payment.id} for saga ${sagaId} processing, will complete in ${delay}ms`);

    setTimeout(async () => {
      try {
        const current = await this.paymentRepo.findByOrderId(sagaId);
        if (!current || current.status !== 'PROCESSING') {
          this.logger.warn(`Payment for saga ${sagaId} is no longer PROCESSING, skipping`);
          return;
        }

        if (Math.random() < this.failureProbability) {
          const reason = Math.random() < 0.5 ? 'INSUFFICIENT_FUNDS' : 'PROVIDER_ERROR';
          await this.paymentRepo.updateStatus(payment.id, 'FAILED', reason);
          this.logger.warn(`Payment ${payment.id} failed for saga ${sagaId}: ${reason}`);
          await this.publisher.publish(new PaymentFailedEvent({
            sagaId,
            paymentId: payment.id,
            reason,
          } as PaymentFailedPayload, correlationId));
        } else {
          await this.paymentRepo.updateStatus(payment.id, 'SUCCEEDED');
          this.logger.log(`Payment ${payment.id} succeeded for saga ${sagaId}`);
          await this.publisher.publish(new PaymentSucceededEvent({
            sagaId,
            paymentId: payment.id,
          } as PaymentSucceededPayload, correlationId));
        }
      } catch (error) {
        this.logger.error(`Failed to complete payment ${payment.id} for saga ${sagaId}: ${error}`);
      }
    }, delay);
  }

  async processRefund(sagaId: string, correlationId: string): Promise<void> {
    const payment = await this.paymentRepo.findByOrderId(sagaId);
    if (!payment) {
      this.logger.warn(`No payment found for saga ${sagaId}, refund is no-op`);
      return;
    }

    if (payment.status !== 'SUCCEEDED') {
      this.logger.warn(`Payment ${payment.id} for saga ${sagaId} is in status ${payment.status}, refund is no-op`);
      return;
    }

    await this.paymentRepo.updateStatus(payment.id, 'REFUNDED');
    this.logger.log(`Payment ${payment.id} refunded for saga ${sagaId}`);
    await this.publisher.publish(new PaymentRefundedEvent({
      sagaId,
      paymentId: payment.id,
    } as PaymentRefundedPayload, correlationId));
  }

  async getPaymentsByOrderId(orderId: string, buyerId: string): Promise<PaymentResponse[]> {
    const payments = await this.paymentRepo.findByBuyerIdAndOrderId(buyerId, orderId);
    return payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      buyerId: p.buyerId,
      amount: p.amount,
      status: p.status,
      reason: p.reason ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  private randomDelay(): number {
    return Math.floor(Math.random() * (this.maxDelayMs - this.minDelayMs + 1)) + this.minDelayMs;
  }
}
