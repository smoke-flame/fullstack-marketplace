import { HttpStatus } from '@nestjs/common';
import { BaseHttpException } from './base-http.exception';

export class RabbitmqClientNotFoundException extends BaseHttpException {
  constructor(eventType: string) {
    super(
      'rabbitmq.CLIENT_NOT_FOUND',
      `No RabbitMQ client is registered for ${eventType}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
