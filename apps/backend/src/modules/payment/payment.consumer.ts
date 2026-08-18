import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Ctx, Payload, RmqContext } from '@nestjs/microservices';
import { PaymentService } from './payment.service';
import { RabbitMQCommandType } from '@modules/rabbitmq/rabbitmq.constants';
import { PaymentChargeCommand } from '../orders/commands/payment-charge.command';
import { PaymentRefundCommand } from '../orders/commands/payment-refund.command';
import { EventIdempotencyService } from '@modules/common/event-idempotency.service';

@Controller()
export class PaymentConsumer {
  private readonly logger = new Logger(PaymentConsumer.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly idempotency: EventIdempotencyService,
  ) {}

  @EventPattern(RabbitMQCommandType.PAYMENT_CHARGE)
  async onPaymentCharge(@Payload() event: PaymentChargeCommand & { eventId: string }, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed payment.charge [${event.correlationId}] for saga ${event.payload.sagaId}`);
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    try {
      if (!await this.idempotency.claim('payment', event.eventId, RabbitMQCommandType.PAYMENT_CHARGE)) {
        await channel.ack(originalMessage);
        return;
      }
      await this.paymentService.processCharge(
        event.payload.sagaId,
        event.payload.amount,
        event.payload.buyerId,
        event.correlationId,
      );
      await channel.ack(originalMessage);
    } catch (error) {
      await this.idempotency.releaseClaim('payment', event.eventId);
      this.logger.error(`Payment charge failed for saga ${event.payload.sagaId}: ${error}`);
      await channel.nack(originalMessage, false, true);
    }
  }

  @EventPattern(RabbitMQCommandType.PAYMENT_REFUND)
  async onPaymentRefund(@Payload() event: PaymentRefundCommand & { eventId: string }, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed payment.refund [${event.correlationId}] for saga ${event.payload.sagaId}`);
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    try {
      if (!await this.idempotency.claim('payment', event.eventId, RabbitMQCommandType.PAYMENT_REFUND)) {
        await channel.ack(originalMessage);
        return;
      }
      await this.paymentService.processRefund(event.payload.sagaId, event.correlationId);
      await channel.ack(originalMessage);
    } catch (error) {
      await this.idempotency.releaseClaim('payment', event.eventId);
      this.logger.error(`Payment refund failed for saga ${event.payload.sagaId}: ${error}`);
      await channel.nack(originalMessage, false, true);
    }
  }
}
