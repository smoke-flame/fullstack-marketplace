import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';
import { InventoryReleaseCommand } from '@modules/orders/commands/inventory-release.command';
import { OrderCancelledEvent } from '@modules/orders/events/order.cancelled.event';
import type { PaymentDlqPayload } from './events/payment-dlq.event';

@Injectable()
export class PaymentDlqService {
    private readonly logger = new Logger(PaymentDlqService.name);

    constructor(private readonly publisher: EventPublisher) { }

    async replayPaymentDlq(payload: PaymentDlqPayload): Promise<void> {
        const { sagaId, orderId, reason, correlationId, buyerId } = payload;

        this.logger.log(`Replaying payment DLQ message [${correlationId}] for order ${orderId} (saga ${sagaId}), reason: ${reason}`);

        await this.publisher.publish(new InventoryReleaseCommand({ sagaId }, correlationId));

        await this.publisher.publish(new OrderCancelledEvent({ orderId, buyerId, reason: 'payment_failed' }, correlationId));
    }
}
