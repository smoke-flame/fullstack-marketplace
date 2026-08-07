import { Module } from '@nestjs/common';
import { MailerService } from './notification.service';
import { NotificationConsumer } from './notification.consumer';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { UserCreatedTemplate } from './templates/user-created.template';

@Module({
  imports: [RabbitmqModule],
  providers: [MailerService, NotificationConsumer, UserCreatedTemplate],
  exports: [MailerService],
})
export class NotificationModule {}
