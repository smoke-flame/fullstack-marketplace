import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';
import { RabbitMQEventType, RabbitMQCommandType } from '@modules/rabbitmq/rabbitmq.constants';
import { env } from '@config/env';
import { UserCreatedTemplate } from './templates/user-created.template';
import { OrderCompletedTemplate } from './templates/order-completed.template';
import { OrderCancelledTemplate } from './templates/order-cancelled.template';
import { NotificationSendTemplate } from './templates/notification-send.template';
import { DlqEvent } from './events/dlq.event';
import { UserCreatedEvent, type UserCreatedPayload } from '@modules/auth/events/user-created.event';
import { OrderCompletedEvent } from '../orders/events/order.completed.event';
import { OrderCancelledEvent } from '../orders/events/order.cancelled.event';
import type { OrderCancelledPayload } from '@marketplace/contracts/events/order/order-events';
import { NotificationSendCommand } from '../orders/commands/notification-send.command';
import type { OrderCompletedPayload } from '@marketplace/contracts/events/order/order-events';
import type { NotificationSendCommand as NotificationSendCommandPayload } from '@marketplace/contracts/events/commands';

interface NotificationMessage {
  type: string;
  to: string;
  subject: string;
  body: string;
  meta: Record<string, unknown>;
}

interface RetryContext {
  retries: number;
  maxRetries: number;
  baseDelayMs: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly failureProbability: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;

  constructor(
    private readonly publisher: EventPublisher,
    private readonly userCreatedTemplate: UserCreatedTemplate,
    private readonly orderCompletedTemplate: OrderCompletedTemplate,
    private readonly orderCancelledTemplate: OrderCancelledTemplate,
    private readonly notificationSendTemplate: NotificationSendTemplate,
  ) {
    this.failureProbability = env.NOTIFICATION_FAILURE_PROBABILITY ?? 0;
    this.maxRetries = env.NOTIFICATION_MAX_RETRIES ?? 5;
    this.baseDelayMs = env.NOTIFICATION_RETRY_BASE_DELAY_MS ?? 1000;
  }

  async sendWelcomeEmail(payload: { userId: string; email: string; roles: string[] }): Promise<void> {
    const message = this.userCreatedTemplate.render(payload);
    await this.sendWithRetry('user.registered', message);
  }

  async sendOrderCompleted(payload: { orderId: string; buyerId: string; items: Array<{ productId: string; qty: number }> }): Promise<void> {
    const message = this.orderCompletedTemplate.render(payload);
    await this.sendWithRetry('order.completed', message);
  }

  async sendOrderCancelled(payload: { orderId: string; buyerId: string; reason: string }): Promise<void> {
    const message = this.orderCancelledTemplate.render(payload);
    await this.sendWithRetry('order.cancelled', message);
  }

  async sendNotificationCommand(payload: { orderId: string; userId: string }): Promise<void> {
    const message = this.notificationSendTemplate.render(payload);
    await this.sendWithRetry('notification.send', message);
  }

  async sendWithRetry(eventType: string, message: NotificationMessage): Promise<void> {
    const ctx: RetryContext = {
      retries: 0,
      maxRetries: this.maxRetries,
      baseDelayMs: this.baseDelayMs,
    };

    while (ctx.retries <= ctx.maxRetries) {
      try {
        if (Math.random() < this.failureProbability) {
          throw new Error(`Simulated notification failure for ${eventType}`);
        }

        this.logger.log(`Notification sent: ${JSON.stringify({ eventType, message })}`);
        return;
      } catch (error) {
        ctx.retries++;
        if (ctx.retries > ctx.maxRetries) {
          this.logger.error(`Notification failed after ${ctx.maxRetries} retries: ${eventType}`, error);
          await this.publishToDlq(eventType, message, 'MAX_RETRIES_EXCEEDED');
          return;
        }

        const delay = this.calculateBackoff(ctx.retries);
        this.logger.warn(`Notification attempt ${ctx.retries} failed for ${eventType}, retrying in ${delay}ms`);
        await this.sleep(delay);
      }
    }
  }

  async publishToDlq(eventType: string, message: NotificationMessage, reason: string): Promise<void> {
    const dlqMessage = {
      ...message,
      originalEventType: eventType,
      failedAt: new Date().toISOString(),
      reason,
    };
    await this.publisher.publish(new DlqEvent(dlqMessage, ''));
    this.logger.error(`Published to DLQ: ${JSON.stringify(dlqMessage)}`);
  }

  async getDlqMessages(): Promise<Record<string, unknown>[]> {
    return [];
  }

  async replayDlqMessage(message: Record<string, unknown>): Promise<void> {
    const eventType = message.originalEventType || message.type;
    const payload = message.meta || message.payload;

    if (!eventType || !payload) {
      throw new Error('DLQ message missing originalEventType or payload');
    }

    switch (eventType) {
      case RabbitMQEventType.USER_CREATED:
      case 'user.registered':
        await this.publisher.publish(new UserCreatedEvent(payload as unknown as UserCreatedPayload, ''));
        break;
      case RabbitMQEventType.ORDER_COMPLETED:
      case 'order.completed':
        await this.publisher.publish(new OrderCompletedEvent(payload as unknown as OrderCompletedPayload, ''));
        break;
      case RabbitMQEventType.ORDER_CANCELLED:
      case 'order.cancelled':
        await this.publisher.publish(new OrderCancelledEvent(payload as unknown as OrderCancelledPayload, ''));
        break;
      case RabbitMQCommandType.NOTIFICATION_SEND:
      case 'notification.send':
        await this.publisher.publish(new NotificationSendCommand(payload as unknown as NotificationSendCommandPayload, ''));
        break;
      default:
        this.logger.warn(`Unknown event type in DLQ: ${eventType}`);
    }
  }

  private calculateBackoff(attempt: number): number {
    return Math.min(this.baseDelayMs * Math.pow(2, attempt - 1), 30000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
