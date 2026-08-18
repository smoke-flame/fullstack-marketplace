import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQCommandType } from '@modules/rabbitmq/rabbitmq.constants';
import { type PaymentChargeCommand as PaymentChargeCommandPayload } from '@marketplace/contracts/events/commands';

export class PaymentChargeCommand extends RabbitMQEvent {
  readonly eventType = RabbitMQCommandType.PAYMENT_CHARGE;
  readonly payload: PaymentChargeCommandPayload;

  constructor(payload: PaymentChargeCommandPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
