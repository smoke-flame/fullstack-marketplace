import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentConsumer } from './payment.consumer';
import { PrismaPaymentRepository } from './repositories/payment.repository.prisma';
import { PAYMENT_REPOSITORY } from './repositories/payment.repository';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { RabbitmqModule } from '@modules/rabbitmq/rabbitmq.module';

@Module({
  imports: [PrismaModule, RabbitmqModule],
  providers: [
    PaymentService,
    PrismaPaymentRepository,
    { provide: PAYMENT_REPOSITORY, useClass: PrismaPaymentRepository },
  ],
  controllers: [PaymentController, PaymentConsumer],
  exports: [PaymentService],
})
export class PaymentModule {}
