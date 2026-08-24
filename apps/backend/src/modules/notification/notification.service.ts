import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';
import { RabbitMQEventType, RabbitMQCommandType } from '@modules/rabbitmq/rabbitmq.constants';
import { DlqEvent } from '@modules/rabbitmq/dlq.event';
import { env } from '@config/env';
import { UserCreatedTemplate } from './templates/user-created.template';
import { OrderCompletedTemplate } from './templates/order-completed.template';
import { OrderCancelledTemplate } from './templates/order-cancelled.template';
import { NotificationSendTemplate } from './templates/notification-send.template';
import { NotificationSentEvent } from './events/notification-sent.event';

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

export interface SentNotification {
  eventType: string;
  correlationId: string;
  message: string;
  sentAt: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly failureProbability: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly sentNotifications: SentNotification[] = [];
  private readonly maxStoredNotifications = 200;

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

  getSentNotifications(): SentNotification[] {
    return this.sentNotifications;
  }

  clearSentNotifications(): void {
    this.sentNotifications.length = 0;
  }

  private recordNotification(eventType: string, correlationId: string, message: NotificationMessage): void {
    if (env.NODE_ENV === 'production') return;
    this.sentNotifications.push({
      eventType,
      correlationId,
      message: JSON.stringify(message),
      sentAt: new Date(),
    });
    if (this.sentNotifications.length > this.maxStoredNotifications) {
      this.sentNotifications.splice(0, this.sentNotifications.length - this.maxStoredNotifications);
    }
  }

  async sendWelcomeEmail(payload: { userId: string; email: string; roles: string[] }, correlationId: string): Promise<void> {
    const message = this.userCreatedTemplate.render(payload);
    await this.sendWithRetry(RabbitMQEventType.USER_CREATED, message, correlationId);
  }

  async sendOrderCompleted(payload: { orderId: string; buyerId: string; items: Array<{ productId: string; qty: number }> }, correlationId: string): Promise<void> {
    const message = this.orderCompletedTemplate.render(payload);
    await this.sendWithRetry(RabbitMQEventType.ORDER_COMPLETED, message, correlationId);
  }

  async sendOrderCancelled(payload: { orderId: string; buyerId: string; reason: string }, correlationId: string): Promise<void> {
    const message = this.orderCancelledTemplate.render(payload);
    await this.sendWithRetry(RabbitMQEventType.ORDER_CANCELLED, message, correlationId);
  }

  async sendNotificationCommand(payload: { orderId: string; userId: string }, correlationId: string): Promise<void> {
    const message = this.notificationSendTemplate.render(payload);
    const sent = await this.sendWithRetry(RabbitMQCommandType.NOTIFICATION_SEND, message, correlationId);
    if (sent) {
      await this.publisher.publish(new NotificationSentEvent({ orderId: payload.orderId }, correlationId));
    }
  }

  async sendWithRetry(eventType: string, message: NotificationMessage, correlationId: string): Promise<boolean> {
    message.meta = { ...message.meta, correlationId };
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

        this.logger.log(`Notification sent: ${JSON.stringify({ eventType, correlationId, message })}`);
        this.recordNotification(eventType, correlationId, message);
        return true;
      } catch (error) {
        ctx.retries++;
        if (ctx.retries > ctx.maxRetries) {
          this.logger.error(`Notification failed after ${ctx.maxRetries} retries: ${eventType} [${correlationId}]`, error);
          await this.publishToDlq(eventType, message, 'MAX_RETRIES_EXCEEDED', correlationId);
          return false;
        }

        const delay = this.calculateBackoff(ctx.retries);
        this.logger.warn(`Notification attempt ${ctx.retries} failed for ${eventType} [${correlationId}], retrying in ${delay}ms`);
        await this.sleep(delay);
      }
    }

    return false;
  }

  async publishToDlq(eventType: string, message: NotificationMessage, reason: string, correlationId: string): Promise<void> {
    // store the full message as the original payload so replay can reconstruct the original command
    await this.publisher.publish(new DlqEvent({
      originalEventType: eventType,
      originalPayload: message,
      reason,
      failedAt: new Date().toISOString(),
      correlationId,
    }, correlationId));
    this.logger.error(`Published to DLQ [${correlationId}]: ${eventType} (${reason})`);
  }

  private calculateBackoff(attempt: number): number {
    return Math.min(this.baseDelayMs * Math.pow(2, attempt - 1), 30000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
