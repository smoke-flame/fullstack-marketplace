import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RabbitMQEvent } from './rabbitmq.event';
import { RABBITMQ_USER_CREATED_CLIENT, RabbitMQEventType } from './rabbitmq.constants'
import { lastValueFrom } from 'rxjs';

@Injectable()
export class EventPublisher {
  private readonly clients: ReadonlyMap<string, ClientProxy>;

  constructor(
    @Inject(RABBITMQ_USER_CREATED_CLIENT) userCreatedClient: ClientProxy,
  ) {
    this.clients = new Map([
      [RabbitMQEventType.USER_CREATED, userCreatedClient],
    ]);
  }

  async publish(event: RabbitMQEvent): Promise<void> {
    const client = this.clients.get(event.eventType);
    const queueName = event.eventType;
    if (!client) {
      throw new Error(`No RabbitMQ client is registered for ${event.eventType}`);
    }

    await lastValueFrom(client.emit(queueName, event.toJSON()));
  }
}
