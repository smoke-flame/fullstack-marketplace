import type { UserRole } from '@marketplace/contracts/models/user';
import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';

export type UserCreatedPayload = {
  userId: string;
  email: string;
  roles: UserRole[];
};

export class UserCreatedEvent extends RabbitMQEvent {
  readonly eventType = RabbitMQEventType.USER_CREATED;
  readonly payload: UserCreatedPayload;

  constructor(payload: UserCreatedPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
