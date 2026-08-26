import { v4 as uuidv4 } from 'uuid';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';
import { NotificationService } from '@modules/notification/notification.service';
import { NotificationDlqService } from '@modules/notification/notification.dlq';
import { UserCreatedTemplate } from '@modules/notification/templates/user-created.template';
import { OrderCompletedTemplate } from '@modules/notification/templates/order-completed.template';
import { OrderCancelledTemplate } from '@modules/notification/templates/order-cancelled.template';
import { NotificationSendTemplate } from '@modules/notification/templates/notification-send.template';
import { UserCreatedEvent } from '@modules/auth/events/user-created.event';
import { OrderCompletedEvent } from '@modules/orders/events/order.completed.event';
import { OrderCancelledEvent } from '@modules/orders/events/order.cancelled.event';
import { NotificationSendCommand } from '@modules/orders/commands/notification-send.command';

jest.mock('@config/env', () => ({
  env: {
    NOTIFICATION_FAILURE_PROBABILITY: 1,
    NOTIFICATION_MAX_RETRIES: 3,
    NOTIFICATION_RETRY_BASE_DELAY_MS: 10,
    NODE_ENV: 'test',
  },
}));

describe('Notification DLQ (Jest)', () => {
  let mockPublisher: { publish: jest.Mock };
  let notificationService: NotificationService;
  let dlqService: NotificationDlqService;

  beforeEach(() => {
    mockPublisher = { publish: jest.fn() };
    notificationService = new NotificationService(
      mockPublisher as unknown as EventPublisher,
      new UserCreatedTemplate(),
      new OrderCompletedTemplate(),
      new OrderCancelledTemplate(),
      new NotificationSendTemplate(),
    );
    notificationService.clearSentNotifications();
    dlqService = new NotificationDlqService(mockPublisher as unknown as EventPublisher);
  });

  it('sends failed notification to DLQ after max retries with 100% failure probability', async () => {
    const correlationId = uuidv4();
    await notificationService.sendWelcomeEmail(
      { userId: 'user-1', email: 'test@example.com', roles: ['buyer'] },
      correlationId,
    );

    expect(mockPublisher.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = mockPublisher.publish.mock.calls[0][0];
    expect(publishedEvent.eventType).toBe('notification.dlq');
    expect((publishedEvent.payload as any).originalEventType).toBe('user.created');
    expect((publishedEvent.payload as any).reason).toBe('MAX_RETRIES_EXCEEDED');
    expect((publishedEvent.payload as any).correlationId).toBe(correlationId);
    expect(notificationService.getSentNotifications()).toHaveLength(0);
  }, 30000);

  it('replays user.created DLQ message correctly', async () => {
    const correlationId = uuidv4();
    const dlqPayload = {
      originalEventType: 'user.created',
      originalPayload: {
        type: 'user.registered',
        to: 'test@example.com',
        subject: 'Welcome',
        body: 'Hi test, welcome!',
        meta: { userId: 'user-1', roles: ['buyer'] },
      },
      reason: 'MAX_RETRIES_EXCEEDED',
      failedAt: new Date().toISOString(),
      correlationId,
    };

    await dlqService.replayNotificationDlq(dlqPayload as any);

    expect(mockPublisher.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = mockPublisher.publish.mock.calls[0][0];
    expect(publishedEvent).toBeInstanceOf(UserCreatedEvent);
    expect(publishedEvent.eventType).toBe('user.created');
    expect(publishedEvent.correlationId).toBe(correlationId);
    expect((publishedEvent.payload as any).userId).toBe('user-1');
  });

  it('replays order.completed DLQ message correctly', async () => {
    const correlationId = uuidv4();
    const dlqPayload = {
      originalEventType: 'order.completed',
      originalPayload: {
        type: 'order.completed',
        to: 'buyer-1@marketplace.local',
        subject: 'Order Confirmed',
        body: 'Order order-1 completed.',
        meta: { orderId: 'order-1', buyerId: 'buyer-1', itemCount: 2 },
      },
      reason: 'MAX_RETRIES_EXCEEDED',
      failedAt: new Date().toISOString(),
      correlationId,
    };

    await dlqService.replayNotificationDlq(dlqPayload as any);

    expect(mockPublisher.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = mockPublisher.publish.mock.calls[0][0];
    expect(publishedEvent).toBeInstanceOf(OrderCompletedEvent);
    expect(publishedEvent.eventType).toBe('order.completed');
    expect((publishedEvent.payload as any).orderId).toBe('order-1');
  });

  it('replays order.cancelled DLQ message correctly', async () => {
    const correlationId = uuidv4();
    const dlqPayload = {
      originalEventType: 'order.cancelled',
      originalPayload: {
        type: 'order.cancelled',
        to: 'buyer-1@marketplace.local',
        subject: 'Order Cancelled',
        body: 'Order order-1 cancelled. Reason: payment_failed',
        meta: { orderId: 'order-1', buyerId: 'buyer-1', reason: 'payment_failed' },
      },
      reason: 'MAX_RETRIES_EXCEEDED',
      failedAt: new Date().toISOString(),
      correlationId,
    };

    await dlqService.replayNotificationDlq(dlqPayload as any);

    expect(mockPublisher.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = mockPublisher.publish.mock.calls[0][0];
    expect(publishedEvent).toBeInstanceOf(OrderCancelledEvent);
    expect(publishedEvent.eventType).toBe('order.cancelled');
    expect((publishedEvent.payload as any).reason).toBe('payment_failed');
  });

  it('replays notification.send DLQ message correctly', async () => {
    const correlationId = uuidv4();
    const dlqPayload = {
      originalEventType: 'notification.send',
      originalPayload: {
        type: 'notification.send',
        to: 'user-1@marketplace.local',
        subject: 'Order Update',
        body: 'Notification for order order-1',
        meta: { orderId: 'order-1', userId: 'user-1' },
      },
      reason: 'MAX_RETRIES_EXCEEDED',
      failedAt: new Date().toISOString(),
      correlationId,
    };

    await dlqService.replayNotificationDlq(dlqPayload as any);

    expect(mockPublisher.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = mockPublisher.publish.mock.calls[0][0];
    expect(publishedEvent).toBeInstanceOf(NotificationSendCommand);
    expect(publishedEvent.eventType).toBe('notification.send');
    expect((publishedEvent.payload as any).orderId).toBe('order-1');
  });
});
