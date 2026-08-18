import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Ctx, RmqContext } from '@nestjs/microservices';
import { PaymentService } from './payment.service';
import { RabbitMQCommandType } from '@modules/rabbitmq/rabbitmq.constants';
import { PaymentChargeCommand } from '../orders/commands/payment-charge.command';
import { PaymentRefundCommand } from '../orders/commands/payment-refund.command';

@Injectable()
export class PaymentConsumer {
  private readonly logger = new Logger(PaymentConsumer.name);

  constructor(private readonly paymentService: PaymentService) {}

  @EventPattern(RabbitMQCommandType.PAYMENT_CHARGE)
  async onPaymentCharge(@Ctx() context: RmqContext, event: PaymentChargeCommand) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    try {
      await this.paymentService.processCharge(
        event.payload.sagaId,
        event.payload.amount,
        event.payload.buyerId,
        event.correlationId,
      );
      await channel.ack(originalMessage);
    } catch (error) {
      this.logger.error(`Payment charge failed for saga ${event.payload.sagaId}: ${error}`);
      await channel.nack(originalMessage, false, false);
    }
  }

  @EventPattern(RabbitMQCommandType.PAYMENT_REFUND)
  async onPaymentRefund(@Ctx() context: RmqContext, event: PaymentRefundCommand) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    try {
      await this.paymentService.processRefund(event.payload.sagaId, event.correlationId);
      await channel.ack(originalMessage);
    } catch (error) {
      this.logger.error(`Payment refund failed for saga ${event.payload.sagaId}: ${error}`);
      await channel.nack(originalMessage, false, false);
    }
  }
}
