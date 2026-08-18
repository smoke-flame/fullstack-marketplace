import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderConsumer } from './order.consumer';
import { PrismaOrderRepository } from './repositories/order.repository.prisma';
import { ORDER_REPOSITORY } from './repositories/order.repository';
import { PrismaOutboxRepository } from './outbox/outbox.repository.prisma';
import { OUTBOX_REPOSITORY } from './outbox/outbox.repository';
import { OutboxPublisherService } from './outbox/outbox-publisher.service';
import { OrderSagaOrchestrator } from './saga/order-saga.orchestrator';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { RabbitmqModule } from '@modules/rabbitmq/rabbitmq.module';

@Module({
  imports: [PrismaModule, RabbitmqModule],
  providers: [
    OrderService,
    OrderConsumer,
    OrderSagaOrchestrator,
    PrismaOrderRepository,
    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
    PrismaOutboxRepository,
    { provide: OUTBOX_REPOSITORY, useClass: PrismaOutboxRepository },
    OutboxPublisherService,
  ],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrdersModule {}
