import { Injectable, Inject, Logger } from '@nestjs/common';
import { PaymentRepository, PAYMENT_REPOSITORY } from './repositories/payment.repository';
import { PaymentSucceededEvent, PaymentFailedEvent, PaymentRefundedEvent } from './events';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';
import { type PaymentSucceededPayload, type PaymentFailedPayload, type PaymentRefundedPayload } from '@marketplace/contracts/events/payment/payment-events';
import { env } from '@config/env';
import type { PaymentResponse } from '@marketplace/contracts/models/payment';
import { PaymentDlqEvent } from './events/payment-dlq.event';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly maxRetries: number;
  private readonly baseRetryDelayMs: number;
  private failureProbability: number;

  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly paymentRepo: PaymentRepository,
    private readonly publisher: EventPublisher,
  ) {
    this.failureProbability = env.PAYMENT_FAILURE_PROBABILITY ?? 0.2;
    this.minDelayMs = env.PAYMENT_MIN_DELAY_MS ?? 1000;
    this.maxDelayMs = env.PAYMENT_MAX_DELAY_MS ?? 5000;
    this.maxRetries = env.PAYMENT_MAX_RETRIES ?? 3;
    this.baseRetryDelayMs = env.PAYMENT_RETRY_BASE_DELAY_MS ?? 1000;
  }

  getFailureProbability(): number {
    return this.failureProbability;
  }

  setFailureProbability(value: number): void {
    this.failureProbability = value;
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

    const created = await this.paymentRepo.create({
      orderId: sagaId,
      buyerId,
      amount,
      status: 'PROCESSING',
    });
    if (!created.created) {
      this.logger.log(`Payment already exists for saga ${sagaId}; concurrent charge is a no-op`);
      return;
    }
    const payment = created.payment;

    // Process payment asynchronously with retry/backoff and DLQ on repeated failure
    setTimeout(async () => {
      try {
        let attempt = 0;
        while (attempt <= this.maxRetries) {
          const current = await this.paymentRepo.findByOrderId(sagaId);
          if (!current || current.status !== 'PROCESSING') {
            this.logger.warn(`Payment for saga ${sagaId} is no longer PROCESSING, skipping`);
            return;
          }

          attempt++;
          const delay = this.randomDelay();
          this.logger.log(`Payment ${payment.id} attempt ${attempt}/${this.maxRetries} for saga ${sagaId}, will attempt in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));

          if (Math.random() < this.failureProbability) {
            const reason = Math.random() < 0.5 ? 'INSUFFICIENT_FUNDS' : 'PROVIDER_ERROR';
            this.logger.warn(`Payment ${payment.id} attempt ${attempt} failed for saga ${sagaId}: ${reason}`);
            if (attempt > this.maxRetries) {
              if (!await this.paymentRepo.transitionStatus(payment.id, 'PROCESSING', 'FAILED', reason)) return;
              this.logger.warn(`Payment ${payment.id} failed after ${this.maxRetries} retries for saga ${sagaId}: ${reason}`);
              await this.publisher.publish(new PaymentFailedEvent({
                sagaId,
                paymentId: payment.id,
                reason,
              } as PaymentFailedPayload, correlationId));

              // publish to payment DLQ
              await this.publisher.publish(new PaymentDlqEvent({
                sagaId,
                orderId: payment.orderId,
                paymentId: payment.id,
                amount: payment.amount,
                buyerId: payment.buyerId,
                reason,
                failedAt: new Date().toISOString(),
                correlationId,
              }, correlationId));
              return;
            }

            // backoff before next attempt
            const backoff = Math.min(this.baseRetryDelayMs * Math.pow(2, attempt - 1), 30000);
            this.logger.log(`Waiting ${backoff}ms before next payment attempt for ${payment.id}`);
            await new Promise((r) => setTimeout(r, backoff));
            continue;
          } else {
            if (!await this.paymentRepo.transitionStatus(payment.id, 'PROCESSING', 'SUCCEEDED')) return;
            this.logger.log(`Payment ${payment.id} succeeded for saga ${sagaId}`);
            await this.publisher.publish(new PaymentSucceededEvent({
              sagaId,
              paymentId: payment.id,
            } as PaymentSucceededPayload, correlationId));
            return;
          }
        }
      } catch (error) {
        this.logger.error(`Failed to complete payment ${payment.id} for saga ${sagaId}: ${error}`);
      }
    }, this.randomDelay());
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

    if (!await this.paymentRepo.transitionStatus(payment.id, 'SUCCEEDED', 'REFUNDED')) return;
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
