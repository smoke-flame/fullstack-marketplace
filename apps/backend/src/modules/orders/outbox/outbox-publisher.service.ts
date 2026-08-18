import { Injectable, Logger, Inject, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OutboxRepository, OUTBOX_REPOSITORY } from './outbox.repository';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';
import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQEventType, RabbitMQCommandType } from '@modules/rabbitmq/rabbitmq.constants';
import { OrderCreatedEvent } from '../events/order.created.event';
import { OrderCompletedEvent } from '../events/order.completed.event';
import { OrderCancelledEvent } from '../events/order.cancelled.event';
import { InventoryReserveCommand } from '../commands/inventory-reserve.command';
import { InventoryReleaseCommand } from '../commands/inventory-release.command';
import { PaymentRefundCommand } from '../commands/payment-refund.command';

const EVENT_CONSTRUCTORS: Record<string, new (payload: unknown, correlationId: string) => RabbitMQEvent> = {
  [RabbitMQEventType.ORDER_CREATED]: OrderCreatedEvent as new (payload: unknown, correlationId: string) => RabbitMQEvent,
  [RabbitMQEventType.ORDER_COMPLETED]: OrderCompletedEvent as new (payload: unknown, correlationId: string) => RabbitMQEvent,
  [RabbitMQEventType.ORDER_CANCELLED]: OrderCancelledEvent as new (payload: unknown, correlationId: string) => RabbitMQEvent,
  [RabbitMQCommandType.INVENTORY_RESERVE]: InventoryReserveCommand as new (payload: unknown, correlationId: string) => RabbitMQEvent,
  [RabbitMQCommandType.INVENTORY_RELEASE]: InventoryReleaseCommand as new (payload: unknown, correlationId: string) => RabbitMQEvent,
  [RabbitMQCommandType.PAYMENT_REFUND]: PaymentRefundCommand as new (payload: unknown, correlationId: string) => RabbitMQEvent,
};

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private readonly batchSize = 50;
  private timer?: NodeJS.Timeout;
  private publishing?: Promise<void>;

  constructor(
    @Inject(OUTBOX_REPOSITORY) private readonly outbox: OutboxRepository,
    private readonly publisher: EventPublisher,
  ) {}

  onModuleInit() {
    this.publishPending().catch((error) => this.logger.error(`Outbox publisher error: ${error}`));
    this.timer = setInterval(() => {
      this.publishPending().catch((error) => this.logger.error(`Outbox publisher error: ${error}`));
    }, 5000);
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.publishing;
  }

  async publishPending() {
    if (this.publishing) return this.publishing;
    this.publishing = this.publishBatch().finally(() => {
      this.publishing = undefined;
    });
    return this.publishing;
  }

  private async publishBatch() {
    const events = await this.outbox.findUnpublished(this.batchSize);
    for (const event of events) {
      try {
        const envelope = JSON.parse(event.payload);
        const ctor = EVENT_CONSTRUCTORS[envelope.eventType];
        if (!ctor) throw new Error(`No event constructor registered for ${envelope.eventType}`);
        // The complete envelope, including eventId, is stored in the outbox.
        // Rebuilding it from JSON preserves the same identity after a restart.
        const evt = RabbitMQEvent.fromJSON(envelope, ctor);
        await this.publisher.publish(evt);
        await this.outbox.markPublished(event.id);
      } catch (error) {
        this.logger.error(`Failed to publish outbox event ${event.id}: ${error}`);
      }
    }
  }
}
