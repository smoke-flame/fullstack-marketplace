import { Injectable, Inject } from '@nestjs/common';
import { OrderRepository, ORDER_REPOSITORY, type OrderEntity } from './repositories/order.repository';
import { type OrderItem } from '@marketplace/contracts/models/order';
import { v4 as uuidv4 } from 'uuid';
import { OrderCreatedEvent } from './events/order.created.event';

@Injectable()
export class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepo: OrderRepository,
  ) {}

  async createOrder(buyerId: string, items: OrderItem[], correlationId: string): Promise<OrderEntity> {
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const orderId = uuidv4();
    const event = new OrderCreatedEvent({ orderId, buyerId, items, totalAmount }, correlationId);
    return this.orderRepo.create({
      id: orderId,
      buyerId,
      items,
      totalAmount,
      outbox: { aggregateType: 'Order', eventType: event.eventType, payload: JSON.stringify(event.toJSON()) },
    });
  }

  async findById(id: string): Promise<OrderEntity | null> {
    return this.orderRepo.findById(id);
  }

  async findByBuyerId(buyerId: string): Promise<OrderEntity[]> {
    return this.orderRepo.findByBuyerId(buyerId);
  }
}
