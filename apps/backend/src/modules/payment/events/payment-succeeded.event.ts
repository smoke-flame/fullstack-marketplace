import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';
import { type PaymentSucceededPayload } from '@marketplace/contracts/events/payment/payment-events';

export class PaymentSucceededEvent extends RabbitMQEvent {
  readonly eventType = RabbitMQEventType.PAYMENT_SUCCEEDED;
  readonly payload: PaymentSucceededPayload;

  constructor(payload: PaymentSucceededPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
