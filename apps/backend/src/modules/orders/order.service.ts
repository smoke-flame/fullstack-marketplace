import { Injectable, Inject } from '@nestjs/common';
import { OrderRepository, ORDER_REPOSITORY } from './repositories/order.repository';
import { type OrderItem } from '@marketplace/contracts/models/order';

@Injectable()
export class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepo: OrderRepository,
  ) {}

  async createOrder(buyerId: string, items: OrderItem[]): Promise<any> {
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    return this.orderRepo.create({ buyerId, items, totalAmount });
  }

  async findById(id: string): Promise<any> {
    const order = await this.orderRepo.findById(id);
    if (!order) return null;
    return order;
  }

  async findByBuyerId(buyerId: string): Promise<any[]> {
    return this.orderRepo.findByBuyerId(buyerId);
  }
}
