import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';
import { RabbitMQEventType, RabbitMQCommandType } from '@modules/rabbitmq/rabbitmq.constants';
import type { BaseDlqPayload } from '@modules/rabbitmq/dlq.types';
import { UserCreatedEvent, type UserCreatedPayload } from '@modules/auth/events/user-created.event';
import { OrderCompletedEvent } from '@modules/orders/events/order.completed.event';
import { OrderCancelledEvent } from '@modules/orders/events/order.cancelled.event';
import type { OrderCompletedPayload, OrderCancelledPayload } from '@marketplace/contracts/events/order/order-events';
import { NotificationSendCommand } from '@modules/orders/commands/notification-send.command';
import type { NotificationSendCommand as NotificationSendCommandPayload } from '@marketplace/contracts/events/commands';

export interface NotificationMessage {
    type: string;
    to: string;
    subject: string;
    body: string;
    meta: Record<string, unknown>;
}

export type NotificationDlqPayload =
    | BaseDlqPayload<typeof RabbitMQEventType.USER_CREATED, NotificationMessage & { meta: UserCreatedPayload }>
    | BaseDlqPayload<typeof RabbitMQEventType.ORDER_COMPLETED, NotificationMessage & { meta: OrderCompletedPayload }>
    | BaseDlqPayload<typeof RabbitMQEventType.ORDER_CANCELLED, NotificationMessage & { meta: OrderCancelledPayload }>
    | BaseDlqPayload<typeof RabbitMQCommandType.NOTIFICATION_SEND, NotificationMessage & { meta: NotificationSendCommandPayload }>;

@Injectable()
export class NotificationDlqService {
    private readonly logger = new Logger(NotificationDlqService.name);

    constructor(private readonly publisher: EventPublisher) { }

    async replayNotificationDlq(payload: NotificationDlqPayload): Promise<void> {
        const { originalEventType, originalPayload, correlationId } = payload;

        this.logger.log(`Replaying notification DLQ message [${correlationId}] for event ${originalEventType}`);

        switch (originalEventType) {
            case RabbitMQEventType.USER_CREATED:
                await this.publisher.publish(new UserCreatedEvent(originalPayload.meta, correlationId));
                break;
            case RabbitMQEventType.ORDER_COMPLETED:
                await this.publisher.publish(new OrderCompletedEvent(originalPayload.meta, correlationId));
                break;
            case RabbitMQEventType.ORDER_CANCELLED:
                await this.publisher.publish(new OrderCancelledEvent(originalPayload.meta, correlationId));
                break;
            case RabbitMQCommandType.NOTIFICATION_SEND:
                await this.publisher.publish(new NotificationSendCommand(originalPayload.meta, correlationId));
                break;
            default:
                this.logger.warn(`Unknown event type in notification DLQ replay: ${originalEventType}`);
        }
    }
}
