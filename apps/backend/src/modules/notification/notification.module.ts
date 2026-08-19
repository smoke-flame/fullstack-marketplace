import { Module, forwardRef } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationConsumer } from './notification.consumer';
import { RabbitmqModule } from '@modules/rabbitmq/rabbitmq.module';
import { NotificationDlqService } from './notification.dlq';
import { UserCreatedTemplate } from './templates/user-created.template';
import { OrderCompletedTemplate } from './templates/order-completed.template';
import { OrderCancelledTemplate } from './templates/order-cancelled.template';
import { NotificationSendTemplate } from './templates/notification-send.template';

@Module({
  imports: [forwardRef(() => RabbitmqModule)],
  providers: [
    NotificationService,
    NotificationDlqService,
    UserCreatedTemplate,
    OrderCompletedTemplate,
    OrderCancelledTemplate,
    NotificationSendTemplate,
  ],
  controllers: [NotificationConsumer],
  exports: [NotificationService, NotificationDlqService],
})
export class NotificationModule { }
