import { Injectable } from '@nestjs/common';
import { NotificationTemplate } from './notification.template';
import type { OrderCompletedPayload } from '@marketplace/contracts/events/order/order-events';

@Injectable()
export class OrderCompletedTemplate implements NotificationTemplate<OrderCompletedPayload> {
  render(payload: OrderCompletedPayload) {
    const message = {
      type: 'order.completed',
      to: `buyer-${payload.buyerId}@marketplace.local`,
      subject: 'Order Confirmed',
      body: `Order ${payload.orderId} has been completed successfully. ${payload.items.length} item(s).`,
      meta: {
        orderId: payload.orderId,
        buyerId: payload.buyerId,
        itemCount: payload.items.length,
        items: payload.items,
      },
    };
    return message;
  }
}
