import { EventPattern } from '@nestjs/microservices';
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from './notification.service';
import { UserCreatedEvent } from '../auth/events/user-created.event';
import { RabbitMQEventType } from '../rabbitmq/rabbitmq.constants';

@Injectable()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(private readonly mailerService: MailerService) {}

  @EventPattern(RabbitMQEventType.USER_CREATED)
  async handleUserCreated(event: UserCreatedEvent) {
    this.logger.log(`Received ${RabbitMQEventType.USER_CREATED} event for ${event.payload.email}`);
    await this.mailerService.sendWelcomeEmail(event);
  }
}
