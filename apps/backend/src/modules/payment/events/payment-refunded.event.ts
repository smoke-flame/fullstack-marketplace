import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';
import { type PaymentRefundedPayload } from '@marketplace/contracts/events/payment/payment-events';

export class PaymentRefundedEvent extends RabbitMQEvent {
  readonly eventType = RabbitMQEventType.PAYMENT_REFUNDED;
  readonly payload: PaymentRefundedPayload;

  constructor(payload: PaymentRefundedPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
