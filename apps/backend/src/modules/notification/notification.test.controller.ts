import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import { Internal } from '@modules/common/decorators/internal.decorator';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationTestController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('internal/test/notifications')
  @Internal()
  async getNotifications() {
    return this.notificationService.getSentNotifications();
  }

  @Post('internal/test/notifications/clear')
  @HttpCode(200)
  @Internal()
  async clearNotifications() {
    this.notificationService.clearSentNotifications();
    return { cleared: true };
  }
}
