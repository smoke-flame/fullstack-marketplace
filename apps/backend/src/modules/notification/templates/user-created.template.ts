import { Injectable } from '@nestjs/common';
import { NotificationTemplate } from './notification.template';
import type { UserCreatedPayload } from '../../auth/events/user-created.event';

@Injectable()
export class UserCreatedTemplate implements NotificationTemplate<UserCreatedPayload> {

  render(payload: UserCreatedPayload) {
    const message = {
      type: 'user.created',
      to: payload.email,
      subject: 'Welcome to Marketplace!',
      body: `Hi ${payload.email.split('@')[0]}, thanks for registering.`,
      meta: {
        userId: payload.userId,
        roles: payload.roles,
      },
    };
    return message;
  }
}
