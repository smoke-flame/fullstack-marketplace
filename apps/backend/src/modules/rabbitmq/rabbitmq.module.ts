import { Global, Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { EventPublisher } from './event-publisher';
import { DlqController } from './dlq.controller';
import { NotificationModule } from '@modules/notification/notification.module';
import { PaymentModule } from '@modules/payment/payment.module';
import {
  RabbitMQEventType,
  RabbitMQCommandType,
  createRmqOptions,
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
  RABBITMQ_REVIEW_CREATED_CLIENT,
  RABBITMQ_REVIEW_DELETED_CLIENT,
  RABBITMQ_DLQ_CLIENT,
  RABBITMQ_DLQ_REPLAY_CLIENT,
  RABBITMQ_PAYMENT_DLQ_CLIENT,
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
  DLQ_NAME,
  PAYMENT_DLQ_NAME,
} from './rabbitmq.constants';

@Global()
@Module({
  imports: [
    NotificationModule,
    PaymentModule,
    ClientsModule.register([
      {
        name: RABBITMQ_USER_CREATED_CLIENT,
        ...createRmqOptions(RabbitMQEventType.USER_CREATED),
      },
      {
        name: RABBITMQ_PRODUCT_CREATED_CLIENT,
        ...createRmqOptions(RabbitMQEventType.PRODUCT_CREATED),
      },
      {
        name: RABBITMQ_PRODUCT_UPDATED_CLIENT,
        ...createRmqOptions(RabbitMQEventType.PRODUCT_UPDATED),
      },
      {
        name: RABBITMQ_CART_PRODUCT_UPDATED_CLIENT,
        ...createRmqOptions(QUEUE_CART_PRODUCT_UPDATED),
      },
      {
        name: RABBITMQ_SEARCH_PRODUCT_UPDATED_CLIENT,
        ...createRmqOptions(QUEUE_SEARCH_PRODUCT_UPDATED),
      },
      {
        name: RABBITMQ_PRODUCT_ARCHIVED_CLIENT,
        ...createRmqOptions(RabbitMQEventType.PRODUCT_ARCHIVED),
      },
      {
        name: RABBITMQ_CART_PRODUCT_ARCHIVED_CLIENT,
        ...createRmqOptions(QUEUE_CART_PRODUCT_ARCHIVED),
      },
      {
        name: RABBITMQ_SEARCH_PRODUCT_ARCHIVED_CLIENT,
        ...createRmqOptions(QUEUE_SEARCH_PRODUCT_ARCHIVED),
      },
      {
        name: RABBITMQ_ORDER_CREATED_CLIENT,
        ...createRmqOptions(RabbitMQEventType.ORDER_CREATED),
      },
      {
        name: RABBITMQ_INVENTORY_ORDER_COMPLETED_CLIENT,
        ...createRmqOptions(QUEUE_INVENTORY_ORDER_COMPLETED),
      },
      {
        name: RABBITMQ_REVIEWS_ORDER_COMPLETED_CLIENT,
        ...createRmqOptions(QUEUE_REVIEWS_ORDER_COMPLETED),
      },
      {
        name: RABBITMQ_NOTIFICATION_ORDER_COMPLETED_CLIENT,
        ...createRmqOptions(QUEUE_NOTIFICATION_ORDER_COMPLETED),
      },
      {
        name: RABBITMQ_ORDER_CANCELLED_CLIENT,
        ...createRmqOptions(RabbitMQEventType.ORDER_CANCELLED),
      },
      {
        name: RABBITMQ_INVENTORY_RESERVE_CLIENT,
        ...createRmqOptions(RabbitMQCommandType.INVENTORY_RESERVE),
      },
      {
        name: RABBITMQ_INVENTORY_RELEASE_CLIENT,
        ...createRmqOptions(RabbitMQCommandType.INVENTORY_RELEASE),
      },
      {
        name: RABBITMQ_PAYMENT_CHARGE_CLIENT,
        ...createRmqOptions(RabbitMQCommandType.PAYMENT_CHARGE),
      },
      {
        name: RABBITMQ_PAYMENT_REFUND_CLIENT,
        ...createRmqOptions(RabbitMQCommandType.PAYMENT_REFUND),
      },
      {
        name: RABBITMQ_NOTIFICATION_SEND_CLIENT,
        ...createRmqOptions(RabbitMQCommandType.NOTIFICATION_SEND),
      },
      {
        name: RABBITMQ_INVENTORY_RESERVED_CLIENT,
        ...createRmqOptions(RabbitMQEventType.INVENTORY_RESERVED),
      },
      {
        name: RABBITMQ_INVENTORY_REJECTED_CLIENT,
        ...createRmqOptions(RabbitMQEventType.INVENTORY_REJECTED),
      },
      {
        name: RABBITMQ_PAYMENT_SUCCEEDED_CLIENT,
        ...createRmqOptions(RabbitMQEventType.PAYMENT_SUCCEEDED),
      },
      {
        name: RABBITMQ_PAYMENT_FAILED_CLIENT,
        ...createRmqOptions(RabbitMQEventType.PAYMENT_FAILED),
      },
      {
        name: RABBITMQ_NOTIFICATION_SENT_CLIENT,
        ...createRmqOptions(RabbitMQEventType.NOTIFICATION_SENT),
      },
      {
        name: RABBITMQ_PAYMENT_REFUNDED_CLIENT,
        ...createRmqOptions(RabbitMQEventType.PAYMENT_REFUNDED),
      },
      {
        name: RABBITMQ_REVIEW_CREATED_CLIENT,
        ...createRmqOptions(RabbitMQEventType.REVIEW_CREATED),
      },
      {
        name: RABBITMQ_REVIEW_DELETED_CLIENT,
        ...createRmqOptions(RabbitMQEventType.REVIEW_DELETED),
      },
      {
        name: RABBITMQ_DLQ_CLIENT,
        ...createRmqOptions(DLQ_NAME),
      },
      {
        name: RABBITMQ_DLQ_REPLAY_CLIENT,
        ...createRmqOptions('notification.dlq.replay'),
      },
      {
        name: RABBITMQ_PAYMENT_DLQ_CLIENT,
        ...createRmqOptions(PAYMENT_DLQ_NAME),
      },
    ]),
  ],
  providers: [EventPublisher],
  controllers: [DlqController],
  exports: [EventPublisher],
})
export class RabbitmqModule {}
