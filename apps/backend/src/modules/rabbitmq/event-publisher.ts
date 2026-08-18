import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RabbitMQEvent } from './rabbitmq.event';
import {
  RABBITMQ_USER_CREATED_CLIENT,
  RABBITMQ_PRODUCT_CREATED_CLIENT,
  RABBITMQ_PRODUCT_UPDATED_CLIENT,
  RABBITMQ_PRODUCT_ARCHIVED_CLIENT,
  RABBITMQ_ORDER_CREATED_CLIENT,
  RABBITMQ_ORDER_COMPLETED_CLIENT,
  RABBITMQ_ORDER_CANCELLED_CLIENT,
  RABBITMQ_INVENTORY_RESERVE_CLIENT,
  RABBITMQ_INVENTORY_RELEASE_CLIENT,
  RABBITMQ_PAYMENT_CHARGE_CLIENT,
  RABBITMQ_PAYMENT_REFUND_CLIENT,
  RABBITMQ_NOTIFICATION_SEND_CLIENT,
  RABBITMQ_INVENTORY_RESERVED_CLIENT,
  RABBITMQ_INVENTORY_REJECTED_CLIENT,
  RABBITMQ_PAYMENT_SUCCEEDED_CLIENT,
  RABBITMQ_PAYMENT_FAILED_CLIENT,
  RABBITMQ_NOTIFICATION_SENT_CLIENT,
  RABBITMQ_PAYMENT_REFUNDED_CLIENT,
  RABBITMQ_DLQ_CLIENT,
  RABBITMQ_DLQ_REPLAY_CLIENT,
  RabbitMQEventType,
  RabbitMQCommandType,
  DLQ_NAME,
  DLQ_REPLAY_NAME,
} from './rabbitmq.constants'
import { lastValueFrom } from 'rxjs';
import { RabbitmqClientNotFoundException } from '@modules/common/errors/rabbitmq-errors';

@Injectable()
export class EventPublisher {
  private readonly logger = new Logger(EventPublisher.name);
  private readonly clients: ReadonlyMap<string, ClientProxy>;

  constructor(
    @Inject(RABBITMQ_USER_CREATED_CLIENT) userCreatedClient: ClientProxy,
    @Inject(RABBITMQ_PRODUCT_CREATED_CLIENT) productCreatedClient: ClientProxy,
    @Inject(RABBITMQ_PRODUCT_UPDATED_CLIENT) productUpdatedClient: ClientProxy,
    @Inject(RABBITMQ_PRODUCT_ARCHIVED_CLIENT) productArchivedClient: ClientProxy,
    @Inject(RABBITMQ_ORDER_CREATED_CLIENT) orderCreatedClient: ClientProxy,
    @Inject(RABBITMQ_ORDER_COMPLETED_CLIENT) orderCompletedClient: ClientProxy,
    @Inject(RABBITMQ_ORDER_CANCELLED_CLIENT) orderCancelledClient: ClientProxy,
    @Inject(RABBITMQ_INVENTORY_RESERVE_CLIENT) inventoryReserveClient: ClientProxy,
    @Inject(RABBITMQ_INVENTORY_RELEASE_CLIENT) inventoryReleaseClient: ClientProxy,
    @Inject(RABBITMQ_PAYMENT_CHARGE_CLIENT) paymentChargeClient: ClientProxy,
    @Inject(RABBITMQ_PAYMENT_REFUND_CLIENT) paymentRefundClient: ClientProxy,
    @Inject(RABBITMQ_NOTIFICATION_SEND_CLIENT) notificationSendClient: ClientProxy,
    @Inject(RABBITMQ_INVENTORY_RESERVED_CLIENT) inventoryReservedClient: ClientProxy,
    @Inject(RABBITMQ_INVENTORY_REJECTED_CLIENT) inventoryRejectedClient: ClientProxy,
    @Inject(RABBITMQ_PAYMENT_SUCCEEDED_CLIENT) paymentSucceededClient: ClientProxy,
    @Inject(RABBITMQ_PAYMENT_FAILED_CLIENT) paymentFailedClient: ClientProxy,
    @Inject(RABBITMQ_NOTIFICATION_SENT_CLIENT) notificationSentClient: ClientProxy,
    @Inject(RABBITMQ_PAYMENT_REFUNDED_CLIENT) paymentRefundedClient: ClientProxy,
    @Inject(RABBITMQ_DLQ_CLIENT) dlqClient: ClientProxy,
    @Inject(RABBITMQ_DLQ_REPLAY_CLIENT) dlqReplayClient: ClientProxy,
  ) {
    this.clients = new Map([
      [RabbitMQEventType.USER_CREATED, userCreatedClient],
      [RabbitMQEventType.PRODUCT_CREATED, productCreatedClient],
      [RabbitMQEventType.PRODUCT_UPDATED, productUpdatedClient],
      [RabbitMQEventType.PRODUCT_ARCHIVED, productArchivedClient],
      [RabbitMQEventType.ORDER_CREATED, orderCreatedClient],
      [RabbitMQEventType.ORDER_COMPLETED, orderCompletedClient],
      [RabbitMQEventType.ORDER_CANCELLED, orderCancelledClient],
      [RabbitMQEventType.INVENTORY_RESERVED, inventoryReservedClient],
      [RabbitMQEventType.INVENTORY_REJECTED, inventoryRejectedClient],
      [RabbitMQEventType.PAYMENT_SUCCEEDED, paymentSucceededClient],
      [RabbitMQEventType.PAYMENT_FAILED, paymentFailedClient],
      [RabbitMQEventType.NOTIFICATION_SENT, notificationSentClient],
      [RabbitMQEventType.PAYMENT_REFUNDED, paymentRefundedClient],
      [RabbitMQCommandType.INVENTORY_RESERVE, inventoryReserveClient],
      [RabbitMQCommandType.INVENTORY_RELEASE, inventoryReleaseClient],
      [RabbitMQCommandType.PAYMENT_CHARGE, paymentChargeClient],
      [RabbitMQCommandType.PAYMENT_REFUND, paymentRefundClient],
      [RabbitMQCommandType.NOTIFICATION_SEND, notificationSendClient],
      [DLQ_NAME, dlqClient],
      [DLQ_REPLAY_NAME, dlqReplayClient],
    ] as [string, ClientProxy][]);
  }

  async publish(event: RabbitMQEvent): Promise<void> {
    const client = this.clients.get(event.eventType);
    const queueName = event.eventType;
    if (!client) {
      throw new RabbitmqClientNotFoundException(event.eventType);
    }

    const envelope = event.toJSON();
    this.logger.log(`Publishing RabbitMQ event: ${JSON.stringify({
      eventType: envelope.eventType,
      eventId: envelope.eventId,
      correlationId: envelope.correlationId,
      queue: queueName,
      payload: envelope.payload,
    })}`);

    try {
      await lastValueFrom(client.emit(queueName, envelope));
    } catch (error) {
      this.logger.error(
        `RabbitMQ publish failed: ${JSON.stringify({
          eventType: envelope.eventType,
          eventId: envelope.eventId,
          correlationId: envelope.correlationId,
          queue: queueName,
        })}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
