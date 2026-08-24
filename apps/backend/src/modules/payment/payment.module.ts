import { Module, forwardRef } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentConsumer } from './payment.consumer';
import { PaymentTestController } from './payment.test.controller';
import { PrismaPaymentRepository } from './repositories/payment.repository.prisma';
import { PAYMENT_REPOSITORY } from './repositories/payment.repository';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { RabbitmqModule } from '@modules/rabbitmq/rabbitmq.module';
import { PaymentDlqService } from './payment.dlq';

@Module({
  imports: [PrismaModule, forwardRef(() => RabbitmqModule)],
  providers: [
    PaymentService,
    PaymentDlqService,
    PrismaPaymentRepository,
    { provide: PAYMENT_REPOSITORY, useClass: PrismaPaymentRepository },
  ],
  controllers: [PaymentController, PaymentConsumer, PaymentTestController],
  exports: [PaymentService, PaymentDlqService],
})
export class PaymentModule { }
