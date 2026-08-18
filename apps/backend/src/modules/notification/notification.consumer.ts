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
  ) {}

  @EventPattern(RabbitMQEventType.USER_CREATED)
  async handleUserCreated(@Payload() event: UserCreatedEvent, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed user.created [${event.correlationId}] for user ${event.payload.userId}`);
    try {
      if (!await this.idempotency.claim('notification', event.eventId, RabbitMQEventType.USER_CREATED)) {
        await context.getChannelRef().ack(context.getMessage());
        return;
      }
      await this.notificationService.sendWelcomeEmail(event.payload, event.correlationId);
    } catch (error) {
      await this.idempotency.releaseClaim('notification', event.eventId);
      this.logger.error(`Failed to send welcome email for user ${event.payload.userId} [${event.correlationId}]: ${error}`);
      return context.getChannelRef().nack(context.getMessage(), false, true);
    }
    await context.getChannelRef().ack(context.getMessage());
  }

  @EventPattern(RabbitMQEventType.ORDER_COMPLETED)
  async handleOrderCompleted(@Payload() event: OrderCompletedEvent, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed order.completed [${event.correlationId}] for order ${event.payload.orderId}`);
    try {
      if (!await this.idempotency.claim('notification', event.eventId, RabbitMQEventType.ORDER_COMPLETED)) {
        await context.getChannelRef().ack(context.getMessage());
        return;
      }
      await this.notificationService.sendOrderCompleted(event.payload, event.correlationId);
    } catch (error) {
      await this.idempotency.releaseClaim('notification', event.eventId);
      this.logger.error(`Failed to send order completed notification for order ${event.payload.orderId} [${event.correlationId}]: ${error}`);
      return context.getChannelRef().nack(context.getMessage(), false, true);
    }
    await context.getChannelRef().ack(context.getMessage());
  }

  @EventPattern(RabbitMQEventType.ORDER_CANCELLED)
  async handleOrderCancelled(@Payload() event: OrderCancelledEvent, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed order.cancelled [${event.correlationId}] for order ${event.payload.orderId}`);
    try {
      if (!await this.idempotency.claim('notification', event.eventId, RabbitMQEventType.ORDER_CANCELLED)) {
        await context.getChannelRef().ack(context.getMessage());
        return;
      }
      await this.notificationService.sendOrderCancelled(event.payload, event.correlationId);
    } catch (error) {
      await this.idempotency.releaseClaim('notification', event.eventId);
      this.logger.error(`Failed to send order cancelled notification for order ${event.payload.orderId} [${event.correlationId}]: ${error}`);
      return context.getChannelRef().nack(context.getMessage(), false, true);
    }
    await context.getChannelRef().ack(context.getMessage());
  }

  @EventPattern(RabbitMQCommandType.NOTIFICATION_SEND)
  async handleNotificationSend(@Payload() event: NotificationSendCommand, @Ctx() context: RmqContext) {
    this.logger.log(`Consumed notification.send [${event.correlationId}] for order ${event.payload.orderId}`);
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    try {
      if (!await this.idempotency.claim('notification', event.eventId, RabbitMQCommandType.NOTIFICATION_SEND)) {
        await channel.ack(originalMessage);
        return;
      }
      await this.notificationService.sendNotificationCommand(event.payload, event.correlationId);
    } catch (error) {
      await this.idempotency.releaseClaim('notification', event.eventId);
      this.logger.error(`Failed to send notification command for order ${event.payload.orderId} [${event.correlationId}]: ${error}`);
      await channel.nack(originalMessage, false, true);
      return;
    }
    await channel.ack(originalMessage);
  }
}
