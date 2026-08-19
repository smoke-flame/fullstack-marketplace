import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Ctx, Payload, RmqContext } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { RabbitMQEventType, RabbitMQCommandType } from '@modules/rabbitmq/rabbitmq.constants';
import { UserCreatedEvent } from '@modules/auth/events/user-created.event';
import { OrderCompletedEvent } from '../orders/events/order.completed.event';
import { OrderCancelledEvent } from '../orders/events/order.cancelled.event';
import { NotificationSendCommand } from '../orders/commands/notification-send.command';
import { EventIdempotencyService } from '@modules/common/event-idempotency.service';

@Controller()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly idempotency: EventIdempotencyService,
  ) { }

  @EventPattern(RabbitMQEventType.USER_CREATED)
  async handleUserCreated(@Payload() event: UserCreatedEvent, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed user.created [${event.correlationId}] for user ${event.payload.userId}`);
    try {
      if (await this.idempotency.isProcessed('notification', event.eventId)) {
        await this.idempotency.ack(context.getChannelRef(), context.getMessage());
        return;
      }
      await this.notificationService.sendWelcomeEmail(event.payload, event.correlationId);
      await this.idempotency.markProcessed('notification', event.eventId, RabbitMQEventType.USER_CREATED);
      await this.idempotency.ack(context.getChannelRef(), context.getMessage());
    } catch (error) {
      // do not release claim here; using markProcessed after successful work
      this.logger.error(`Failed to send welcome email for user ${event.payload.userId} [${event.correlationId}]: ${error}`);
      await this.idempotency.nack(context.getChannelRef(), context.getMessage(), true);
    }
  }

  @EventPattern(RabbitMQEventType.ORDER_COMPLETED)
  async handleOrderCompleted(@Payload() event: OrderCompletedEvent, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed order.completed [${event.correlationId}] for order ${event.payload.orderId}`);
    try {
      if (await this.idempotency.isProcessed('notification', event.eventId)) {
        await this.idempotency.ack(context.getChannelRef(), context.getMessage());
        return;
      }
      await this.notificationService.sendOrderCompleted(event.payload, event.correlationId);
      await this.idempotency.markProcessed('notification', event.eventId, RabbitMQEventType.ORDER_COMPLETED);
      await this.idempotency.ack(context.getChannelRef(), context.getMessage());
    } catch (error) {
      // do not release claim here; using markProcessed after successful work
      this.logger.error(`Failed to send order completed notification for order ${event.payload.orderId} [${event.correlationId}]: ${error}`);
      await this.idempotency.nack(context.getChannelRef(), context.getMessage(), true);
    }
  }

  @EventPattern(RabbitMQEventType.ORDER_CANCELLED)
  async handleOrderCancelled(@Payload() event: OrderCancelledEvent, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed order.cancelled [${event.correlationId}] for order ${event.payload.orderId}`);
    try {
      if (await this.idempotency.isProcessed('notification', event.eventId)) {
        await this.idempotency.ack(context.getChannelRef(), context.getMessage());
        return;
      }
      await this.notificationService.sendOrderCancelled(event.payload, event.correlationId);
      await this.idempotency.markProcessed('notification', event.eventId, RabbitMQEventType.ORDER_CANCELLED);
      await this.idempotency.ack(context.getChannelRef(), context.getMessage());
    } catch (error) {
      // do not release claim here; using markProcessed after successful work
      this.logger.error(`Failed to send order cancelled notification for order ${event.payload.orderId} [${event.correlationId}]: ${error}`);
      await this.idempotency.nack(context.getChannelRef(), context.getMessage(), true);
    }
  }

  @EventPattern(RabbitMQCommandType.NOTIFICATION_SEND)
  async handleNotificationSend(@Payload() event: NotificationSendCommand, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed notification.send [${event.correlationId}] for order ${event.payload.orderId}`);
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    try {
      if (await this.idempotency.isProcessed('notification', event.eventId)) {
        await this.idempotency.ack(channel, originalMessage);
        return;
      }
      await this.notificationService.sendNotificationCommand(event.payload, event.correlationId);
      await this.idempotency.markProcessed('notification', event.eventId, RabbitMQCommandType.NOTIFICATION_SEND);
      await this.idempotency.ack(channel, originalMessage);
    } catch (error) {
      // do not release claim here; using markProcessed after successful work
      this.logger.error(`Failed to send notification command for order ${event.payload.orderId} [${event.correlationId}]: ${error}`);
      await this.idempotency.nack(channel, originalMessage, true);
    }
  }
}
