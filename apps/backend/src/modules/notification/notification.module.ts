import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationConsumer } from './notification.consumer';
import { DlqController } from './dlq.controller';
import { RabbitmqModule } from '@modules/rabbitmq/rabbitmq.module';
import { UserCreatedTemplate } from './templates/user-created.template';
import { OrderCompletedTemplate } from './templates/order-completed.template';
import { OrderCancelledTemplate } from './templates/order-cancelled.template';
import { NotificationSendTemplate } from './templates/notification-send.template';

@Module({
  imports: [RabbitmqModule],
  providers: [
    NotificationService,
    NotificationConsumer,
    UserCreatedTemplate,
    OrderCompletedTemplate,
    OrderCancelledTemplate,
    NotificationSendTemplate,
  ],
  controllers: [DlqController],
  exports: [NotificationService],
})
export class NotificationModule {}
