import { RabbitMQEvent } from '@modules/rabbitmq/rabbitmq.event';
import { RabbitMQCommandType } from '@modules/rabbitmq/rabbitmq.constants';
import { type InventoryReleaseCommand as InventoryReleaseCommandPayload } from '@marketplace/contracts/events/commands';

export class InventoryReleaseCommand extends RabbitMQEvent {
  readonly eventType = RabbitMQCommandType.INVENTORY_RELEASE;
  readonly payload: InventoryReleaseCommandPayload;

  constructor(payload: InventoryReleaseCommandPayload, correlationId: string) {
    super(correlationId);
    this.payload = payload;
  }
}
