import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Ctx, RmqContext } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { RabbitMQEventType, RabbitMQCommandType } from '@modules/rabbitmq/rabbitmq.constants';
import { UserCreatedEvent } from '@modules/auth/events/user-created.event';
import { OrderCompletedEvent } from '../orders/events/order.completed.event';
import { OrderCancelledEvent } from '../orders/events/order.cancelled.event';
import { NotificationSendCommand } from '../orders/commands/notification-send.command';

@Injectable()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(private readonly notificationService: NotificationService) {}

  @EventPattern(RabbitMQEventType.USER_CREATED)
  async handleUserCreated(@Ctx() context: RmqContext, event: UserCreatedEvent) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    try {
      await this.notificationService.sendWelcomeEmail(event.payload);
    } catch (error) {
      this.logger.error(`Failed to send welcome email for user ${event.payload.userId}: ${error}`);
    } finally {
      await channel.ack(originalMessage);
    }
  }

  @EventPattern(RabbitMQEventType.ORDER_COMPLETED)
  async handleOrderCompleted(@Ctx() context: RmqContext, event: OrderCompletedEvent) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    try {
      await this.notificationService.sendOrderCompleted(event.payload);
    } catch (error) {
      this.logger.error(`Failed to send order completed notification for order ${event.payload.orderId}: ${error}`);
    } finally {
      await channel.ack(originalMessage);
    }
  }

  @EventPattern(RabbitMQEventType.ORDER_CANCELLED)
  async handleOrderCancelled(@Ctx() context: RmqContext, event: OrderCancelledEvent) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    try {
      await this.notificationService.sendOrderCancelled(event.payload);
    } catch (error) {
      this.logger.error(`Failed to send order cancelled notification for order ${event.payload.orderId}: ${error}`);
    } finally {
      await channel.ack(originalMessage);
    }
  }

  @EventPattern(RabbitMQCommandType.NOTIFICATION_SEND)
  async handleNotificationSend(@Ctx() context: RmqContext, event: NotificationSendCommand) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    try {
      await this.notificationService.sendNotificationCommand(event.payload);
    } catch (error) {
      this.logger.error(`Failed to send notification command for order ${event.payload.orderId}: ${error}`);
    } finally {
      await channel.ack(originalMessage);
    }
  }
}
