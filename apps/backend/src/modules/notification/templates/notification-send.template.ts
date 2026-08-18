import { Injectable } from '@nestjs/common';
import { NotificationTemplate } from './notification.template';
import type { NotificationSendCommand } from '@marketplace/contracts/events/commands';

@Injectable()
export class NotificationSendTemplate implements NotificationTemplate<NotificationSendCommand> {
  render(payload: NotificationSendCommand) {
    const message = {
      type: 'notification.send',
      to: `user-${payload.userId}@marketplace.local`,
      subject: 'Order Update',
      body: `Notification for order ${payload.orderId}`,
      meta: {
        orderId: payload.orderId,
        userId: payload.userId,
      },
    };
    return message;
  }
}
