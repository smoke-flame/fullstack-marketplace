import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQEventType } from '@modules/rabbitmq/rabbitmq.constants';
import { type InventoryReservedPayload, type InventoryRejectedPayload } from '@marketplace/contracts/events/inventory/inventory-events';

export class InventoryReservedEvent extends RabbitMQEvent {
  readonly eventType = RabbitMQEventType.INVENTORY_RESERVED;
  readonly payload: InventoryReservedPayload;

  constructor(payload: InventoryReservedPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}

export class InventoryRejectedEvent extends RabbitMQEvent {
  readonly eventType = RabbitMQEventType.INVENTORY_REJECTED;
  readonly payload: InventoryRejectedPayload;

  constructor(payload: InventoryRejectedPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
