import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RabbitMQEvent } from './rabbitmq.event';
import {
  RABBITMQ_USER_CREATED_CLIENT,
  RABBITMQ_PRODUCT_CREATED_CLIENT,
  RABBITMQ_PRODUCT_UPDATED_CLIENT,
  RABBITMQ_PRODUCT_ARCHIVED_CLIENT,
  RABBITMQ_ORDER_CREATED_CLIENT,
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
  RABBITMQ_CART_PRODUCT_UPDATED_CLIENT,
  RABBITMQ_SEARCH_PRODUCT_UPDATED_CLIENT,
  RABBITMQ_CART_PRODUCT_ARCHIVED_CLIENT,
  RABBITMQ_SEARCH_PRODUCT_ARCHIVED_CLIENT,
  RABBITMQ_INVENTORY_ORDER_COMPLETED_CLIENT,
  RABBITMQ_REVIEWS_ORDER_COMPLETED_CLIENT,
  RABBITMQ_NOTIFICATION_ORDER_COMPLETED_CLIENT,
  QUEUE_CART_PRODUCT_UPDATED,
  QUEUE_SEARCH_PRODUCT_UPDATED,
  QUEUE_CART_PRODUCT_ARCHIVED,
  QUEUE_SEARCH_PRODUCT_ARCHIVED,
  QUEUE_INVENTORY_ORDER_COMPLETED,
  QUEUE_REVIEWS_ORDER_COMPLETED,
  QUEUE_NOTIFICATION_ORDER_COMPLETED,
  RABBITMQ_DLQ_CLIENT,
  RABBITMQ_DLQ_REPLAY_CLIENT,
  RABBITMQ_PAYMENT_DLQ_CLIENT,
  RabbitMQEventType,
  RabbitMQCommandType,
  DLQ_NAME,
  DLQ_REPLAY_NAME,
  PAYMENT_DLQ_NAME,
} from './rabbitmq.constants';
import { lastValueFrom } from 'rxjs';
import { RabbitmqClientNotFoundException } from '@modules/common/errors/rabbitmq-errors';

@Injectable()
export class EventPublisher {
  private readonly logger = new Logger(EventPublisher.name);
  private readonly targets: ReadonlyMap<string, Array<{ queue: string; client: ClientProxy }>>;

  constructor(
    @Inject(RABBITMQ_USER_CREATED_CLIENT) userCreatedClient: ClientProxy,
    @Inject(RABBITMQ_PRODUCT_CREATED_CLIENT) productCreatedClient: ClientProxy,
    @Inject(RABBITMQ_PRODUCT_UPDATED_CLIENT) productUpdatedClient: ClientProxy,
    @Inject(RABBITMQ_PRODUCT_ARCHIVED_CLIENT) productArchivedClient: ClientProxy,
    @Inject(RABBITMQ_ORDER_CREATED_CLIENT) orderCreatedClient: ClientProxy,
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
    @Inject(RABBITMQ_CART_PRODUCT_UPDATED_CLIENT) cartProductUpdatedClient: ClientProxy,
    @Inject(RABBITMQ_SEARCH_PRODUCT_UPDATED_CLIENT) searchProductUpdatedClient: ClientProxy,
    @Inject(RABBITMQ_CART_PRODUCT_ARCHIVED_CLIENT) cartProductArchivedClient: ClientProxy,
    @Inject(RABBITMQ_SEARCH_PRODUCT_ARCHIVED_CLIENT) searchProductArchivedClient: ClientProxy,
    @Inject(RABBITMQ_INVENTORY_ORDER_COMPLETED_CLIENT) inventoryOrderCompletedClient: ClientProxy,
    @Inject(RABBITMQ_REVIEWS_ORDER_COMPLETED_CLIENT) reviewsOrderCompletedClient: ClientProxy,
    @Inject(RABBITMQ_NOTIFICATION_ORDER_COMPLETED_CLIENT) notificationOrderCompletedClient: ClientProxy,
    @Inject(RABBITMQ_DLQ_CLIENT) dlqClient: ClientProxy,
    @Inject(RABBITMQ_DLQ_REPLAY_CLIENT) dlqReplayClient: ClientProxy,
    @Inject(RABBITMQ_PAYMENT_DLQ_CLIENT) paymentDlqClient: ClientProxy,
  ) {
    this.targets = new Map([
      [RabbitMQEventType.USER_CREATED, [{ queue: RabbitMQEventType.USER_CREATED, client: userCreatedClient }]],
      [RabbitMQEventType.PRODUCT_CREATED, [{ queue: RabbitMQEventType.PRODUCT_CREATED, client: productCreatedClient }]],
      [RabbitMQEventType.PRODUCT_UPDATED, [
        { queue: RabbitMQEventType.PRODUCT_UPDATED, client: productUpdatedClient },
        { queue: QUEUE_CART_PRODUCT_UPDATED, client: cartProductUpdatedClient },
        { queue: QUEUE_SEARCH_PRODUCT_UPDATED, client: searchProductUpdatedClient },
      ]],
      [RabbitMQEventType.PRODUCT_ARCHIVED, [
        { queue: RabbitMQEventType.PRODUCT_ARCHIVED, client: productArchivedClient },
        { queue: QUEUE_CART_PRODUCT_ARCHIVED, client: cartProductArchivedClient },
        { queue: QUEUE_SEARCH_PRODUCT_ARCHIVED, client: searchProductArchivedClient },
      ]],
      [RabbitMQEventType.ORDER_CREATED, [{ queue: RabbitMQEventType.ORDER_CREATED, client: orderCreatedClient }]],
      [RabbitMQEventType.ORDER_COMPLETED, [
        { queue: QUEUE_INVENTORY_ORDER_COMPLETED, client: inventoryOrderCompletedClient },
        { queue: QUEUE_REVIEWS_ORDER_COMPLETED, client: reviewsOrderCompletedClient },
        { queue: QUEUE_NOTIFICATION_ORDER_COMPLETED, client: notificationOrderCompletedClient },
      ]],
      [RabbitMQEventType.ORDER_CANCELLED, [{ queue: RabbitMQEventType.ORDER_CANCELLED, client: orderCancelledClient }]],
      [RabbitMQEventType.INVENTORY_RESERVED, [{ queue: RabbitMQEventType.INVENTORY_RESERVED, client: inventoryReservedClient }]],
      [RabbitMQEventType.INVENTORY_REJECTED, [{ queue: RabbitMQEventType.INVENTORY_REJECTED, client: inventoryRejectedClient }]],
      [RabbitMQEventType.PAYMENT_SUCCEEDED, [{ queue: RabbitMQEventType.PAYMENT_SUCCEEDED, client: paymentSucceededClient }]],
      [RabbitMQEventType.PAYMENT_FAILED, [{ queue: RabbitMQEventType.PAYMENT_FAILED, client: paymentFailedClient }]],
      [RabbitMQEventType.NOTIFICATION_SENT, [{ queue: RabbitMQEventType.NOTIFICATION_SENT, client: notificationSentClient }]],
      [RabbitMQEventType.PAYMENT_REFUNDED, [{ queue: RabbitMQEventType.PAYMENT_REFUNDED, client: paymentRefundedClient }]],
      [RabbitMQCommandType.INVENTORY_RESERVE, [{ queue: RabbitMQCommandType.INVENTORY_RESERVE, client: inventoryReserveClient }]],
      [RabbitMQCommandType.INVENTORY_RELEASE, [{ queue: RabbitMQCommandType.INVENTORY_RELEASE, client: inventoryReleaseClient }]],
      [RabbitMQCommandType.PAYMENT_CHARGE, [{ queue: RabbitMQCommandType.PAYMENT_CHARGE, client: paymentChargeClient }]],
      [RabbitMQCommandType.PAYMENT_REFUND, [{ queue: RabbitMQCommandType.PAYMENT_REFUND, client: paymentRefundClient }]],
      [RabbitMQCommandType.NOTIFICATION_SEND, [{ queue: RabbitMQCommandType.NOTIFICATION_SEND, client: notificationSendClient }]],
      [DLQ_NAME, [{ queue: DLQ_NAME, client: dlqClient }]],
      [DLQ_REPLAY_NAME, [{ queue: DLQ_REPLAY_NAME, client: dlqReplayClient }]],
      [PAYMENT_DLQ_NAME, [{ queue: PAYMENT_DLQ_NAME, client: paymentDlqClient }]],
    ]);
  }

  async publish(event: RabbitMQEvent): Promise<void> {
    const targets = this.targets.get(event.eventType);
    if (!targets || targets.length === 0) {
      throw new RabbitmqClientNotFoundException(event.eventType);
    }

    const envelope = event.toJSON();
    for (const target of targets) {
      this.logger.log(`Publishing RabbitMQ event: ${JSON.stringify({
        eventType: envelope.eventType,
        eventId: envelope.eventId,
        correlationId: envelope.correlationId,
        queue: target.queue,
        payload: envelope.payload,
      })}`);

      try {
        await lastValueFrom(target.client.emit(target.queue, envelope));
      } catch (error) {
        this.logger.error(
          `RabbitMQ publish failed: ${JSON.stringify({
            eventType: envelope.eventType,
            eventId: envelope.eventId,
            correlationId: envelope.correlationId,
            queue: target.queue,
          })}`,
          error instanceof Error ? error.stack : String(error),
        );
        throw error;
      }
    }
  }
}
