import { Injectable, Logger } from '@nestjs/common';
import { UserCreatedTemplate } from './templates/user-created.template';
import { UserCreatedEvent } from '../auth/events/user-created.event';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly userCreatedTemplate: UserCreatedTemplate) { }

  async onModuleInit() {
    this.logger.log('Notification module initialized');
  }

  async sendWelcomeEmail(event: UserCreatedEvent) {
    const message = this.userCreatedTemplate.render(event.payload);
    this.logger.log(`Notification message: ${JSON.stringify(message, null, 2)}`);
  }
}


