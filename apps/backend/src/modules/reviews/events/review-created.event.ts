import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';
import { type ReviewCreatedPayload } from '@marketplace/contracts/events/review/review-events';

export class ReviewCreatedEvent extends RabbitMQEvent {
  readonly eventType = RabbitMQEventType.REVIEW_CREATED;
  readonly payload: ReviewCreatedPayload;

  constructor(payload: ReviewCreatedPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
