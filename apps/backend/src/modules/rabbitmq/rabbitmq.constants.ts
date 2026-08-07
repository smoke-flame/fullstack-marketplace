import { Transport } from '@nestjs/microservices';
import { env } from '../../config/env';

export enum RabbitMQEventType {
  USER_CREATED = 'user.created',
}

export const RABBITMQ_USER_CREATED_CLIENT = 'USER_CREATED_CLIENT';

export const DEFAULT_RABBITMQ_URL = 'amqp://marketplace:change-me-in-production@localhost:5672';

export function createRmqOptions(queue: string, noAck = true) {
  return {
    transport: Transport.RMQ as typeof Transport.RMQ,
    options: {
      urls: [env.RABBITMQ_URL ?? DEFAULT_RABBITMQ_URL],
      queue,
      queueOptions: { durable: true },
      noAck,
      persistent: true,
      prefetchCount: 1,
    },
  };
}
