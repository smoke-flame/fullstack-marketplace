import { Global, Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { EventPublisher } from './event-publisher';
import { RabbitMQEventType, createRmqOptions } from './rabbitmq.constants';

import { RABBITMQ_USER_CREATED_CLIENT } from './rabbitmq.constants';

@Global()
@Module({
  imports: [
    ClientsModule.register([
      {
        name: RABBITMQ_USER_CREATED_CLIENT,
        ...createRmqOptions(RabbitMQEventType.USER_CREATED),
      },
    ]),
  ],
  providers: [
    EventPublisher,
  ],
  exports: [EventPublisher],
})
export class RabbitmqModule { }
