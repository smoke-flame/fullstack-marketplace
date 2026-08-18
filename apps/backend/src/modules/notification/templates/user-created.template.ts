import { Injectable } from '@nestjs/common';
import { NotificationTemplate } from './notification.template';

export interface UserCreatedNotification extends Record<string, unknown> {
  userId: string;
  email: string;
  roles: string[];
}

@Injectable()
export class UserCreatedTemplate implements NotificationTemplate<UserCreatedNotification> {
  render(payload: UserCreatedNotification) {
    const message = {
      type: 'user.registered',
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
