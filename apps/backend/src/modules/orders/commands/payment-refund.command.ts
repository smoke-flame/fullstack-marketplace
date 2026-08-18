import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQCommandType } from '@modules/rabbitmq/rabbitmq.constants';
import { type PaymentRefundCommand as PaymentRefundCommandPayload } from '@marketplace/contracts/events/commands';

export class PaymentRefundCommand extends RabbitMQEvent {
  readonly eventType = RabbitMQCommandType.PAYMENT_REFUND;
  readonly payload: PaymentRefundCommandPayload;

  constructor(payload: PaymentRefundCommandPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
