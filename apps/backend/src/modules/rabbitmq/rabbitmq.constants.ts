import { Transport } from '@nestjs/microservices';
import { env } from '@config/env';

export enum RabbitMQEventType {
  USER_CREATED = 'user.created',
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  PRODUCT_ARCHIVED = 'product.archived',
  ORDER_CREATED = 'order.created',
  ORDER_COMPLETED = 'order.completed',
  ORDER_CANCELLED = 'order.cancelled',
  INVENTORY_RESERVED = 'inventory.reserved',
  INVENTORY_REJECTED = 'inventory.rejected',
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  NOTIFICATION_SENT = 'notification.sent',
  PAYMENT_REFUNDED = 'payment.refunded',
  REVIEW_CREATED = 'review.created',
  REVIEW_DELETED = 'review.deleted',
}

export const RABBITMQ_USER_CREATED_CLIENT = 'USER_CREATED_CLIENT';
export const RABBITMQ_PRODUCT_CREATED_CLIENT = 'PRODUCT_CREATED_CLIENT';
export const RABBITMQ_PRODUCT_UPDATED_CLIENT = 'PRODUCT_UPDATED_CLIENT';
export const RABBITMQ_PRODUCT_ARCHIVED_CLIENT = 'PRODUCT_ARCHIVED_CLIENT';
export const RABBITMQ_ORDER_CREATED_CLIENT = 'ORDER_CREATED_CLIENT';
export const RABBITMQ_ORDER_COMPLETED_CLIENT = 'ORDER_COMPLETED_CLIENT';
export const RABBITMQ_ORDER_CANCELLED_CLIENT = 'ORDER_CANCELLED_CLIENT';
export const RABBITMQ_INVENTORY_RESERVED_CLIENT = 'INVENTORY_RESERVED_CLIENT';
export const RABBITMQ_INVENTORY_REJECTED_CLIENT = 'INVENTORY_REJECTED_CLIENT';
export const RABBITMQ_PAYMENT_SUCCEEDED_CLIENT = 'PAYMENT_SUCCEEDED_CLIENT';
export const RABBITMQ_PAYMENT_FAILED_CLIENT = 'PAYMENT_FAILED_CLIENT';
export const RABBITMQ_NOTIFICATION_SENT_CLIENT = 'NOTIFICATION_SENT_CLIENT';
export const RABBITMQ_PAYMENT_REFUNDED_CLIENT = 'PAYMENT_REFUNDED_CLIENT';
export const RABBITMQ_REVIEW_CREATED_CLIENT = 'REVIEW_CREATED_CLIENT';
export const RABBITMQ_REVIEW_DELETED_CLIENT = 'REVIEW_DELETED_CLIENT';
export const RABBITMQ_DLQ_CLIENT = 'DLQ_CLIENT';
export const RABBITMQ_DLQ_REPLAY_CLIENT = 'DLQ_REPLAY_CLIENT';

export const DLQ_NAME = 'notification.dlq';
export const DLQ_REPLAY_NAME = 'notification.dlq.replay';

export enum RabbitMQCommandType {
  INVENTORY_RESERVE = 'inventory.reserve',
  INVENTORY_RELEASE = 'inventory.release',
  PAYMENT_CHARGE = 'payment.charge',
  PAYMENT_REFUND = 'payment.refund',
  NOTIFICATION_SEND = 'notification.send',
}

export const RABBITMQ_INVENTORY_RESERVE_CLIENT = 'INVENTORY_RESERVE_CLIENT';
export const RABBITMQ_INVENTORY_RELEASE_CLIENT = 'INVENTORY_RELEASE_CLIENT';
export const RABBITMQ_PAYMENT_CHARGE_CLIENT = 'PAYMENT_CHARGE_CLIENT';
export const RABBITMQ_PAYMENT_REFUND_CLIENT = 'PAYMENT_REFUND_CLIENT';
export const RABBITMQ_NOTIFICATION_SEND_CLIENT = 'NOTIFICATION_SEND_CLIENT';

export const DEFAULT_RABBITMQ_URL = 'amqp://marketplace:change-me-in-production@localhost:5672';

// `noAck: true` is the safe default for client proxies registered in
// `RabbitmqModule` because NestJS RMQ creates an internal reply consumer for
// request/reply patterns, and RabbitMQ's direct-reply-to consumer cannot
// acknowledge manually.  Server-side microservices in `main.ts` pass `false`
// explicitly so their handlers can ack/nack messages themselves.
export function createRmqOptions(queue: string, noAck = true) {
  const isDlq = queue === DLQ_NAME;
  return {
    transport: Transport.RMQ as typeof Transport.RMQ,
    options: {
      urls: [env.RABBITMQ_URL ?? DEFAULT_RABBITMQ_URL],
      queue,
      queueOptions: {
        durable: true,
        ...(isDlq ? {} : { deadLetterExchange: '' }),
      },
      noAck,
      persistent: true,
      prefetchCount: 1,
    },
  };
}
