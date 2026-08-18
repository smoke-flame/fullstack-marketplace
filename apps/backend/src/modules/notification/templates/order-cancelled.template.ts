import { Injectable } from '@nestjs/common';
import { NotificationTemplate } from './notification.template';

export interface OrderCancelledNotification extends Record<string, unknown> {
  orderId: string;
  buyerId: string;
  reason: string;
}

@Injectable()
export class OrderCancelledTemplate implements NotificationTemplate<OrderCancelledNotification> {
  render(payload: OrderCancelledNotification) {
    const message = {
      type: 'order.cancelled',
      to: `buyer-${payload.buyerId}@marketplace.local`,
      subject: 'Order Cancelled',
      body: `Order ${payload.orderId} has been cancelled. Reason: ${payload.reason}`,
      meta: {
        orderId: payload.orderId,
        buyerId: payload.buyerId,
        reason: payload.reason,
      },
    };
    return message;
  }
}
