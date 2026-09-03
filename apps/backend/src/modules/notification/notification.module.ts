import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationConsumer } from './notification.consumer';
import { NotificationTestController } from './notification.test.controller';
import { NotificationDlqService } from './notification.dlq';
import { UserCreatedTemplate } from './templates/user-created.template';
import { OrderCompletedTemplate } from './templates/order-completed.template';
import { OrderCancelledTemplate } from './templates/order-cancelled.template';
import { NotificationSendTemplate } from './templates/notification-send.template';

@Module({
  providers: [
    NotificationService,
    NotificationDlqService,
    UserCreatedTemplate,
    OrderCompletedTemplate,
    OrderCancelledTemplate,
    NotificationSendTemplate,
  ],
  controllers: [NotificationConsumer, NotificationTestController],
  exports: [NotificationService, NotificationDlqService],
})
export class NotificationModule {}
