import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { PAYMENT_DLQ_NAME } from '@modules/rabbitmq/rabbitmq.constants';

export interface PaymentDlqPayload {
  sagaId: string;
  orderId: string;
  paymentId: string;
  amount: number;
  buyerId: string;
  reason: string;
  failedAt: string;
  correlationId: string;
}

export class PaymentDlqEvent extends RabbitMQEvent {
  readonly eventType = PAYMENT_DLQ_NAME;
  readonly payload: PaymentDlqPayload;

  constructor(payload: PaymentDlqPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
