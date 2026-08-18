import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQCommandType } from '@modules/rabbitmq/rabbitmq.constants';
import { type InventoryReserveCommand as InventoryReserveCommandPayload } from '@marketplace/contracts/events/commands';

export class InventoryReserveCommand extends RabbitMQEvent {
  readonly eventType = RabbitMQCommandType.INVENTORY_RESERVE;
  readonly payload: InventoryReserveCommandPayload;

  constructor(payload: InventoryReserveCommandPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
