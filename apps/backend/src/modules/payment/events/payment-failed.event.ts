import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';
import { type PaymentFailedPayload } from '@marketplace/contracts/events/payment/payment-events';

export class PaymentFailedEvent extends RabbitMQEvent {
  readonly eventType = RabbitMQEventType.PAYMENT_FAILED;
  readonly payload: PaymentFailedPayload;

  constructor(payload: PaymentFailedPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
