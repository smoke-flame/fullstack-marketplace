import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';
import { type ReviewDeletedPayload } from '@marketplace/contracts/events/review/review-events';

export class ReviewDeletedEvent extends RabbitMQEvent {
  readonly eventType = RabbitMQEventType.REVIEW_DELETED;
  readonly payload: ReviewDeletedPayload;

  constructor(payload: ReviewDeletedPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
