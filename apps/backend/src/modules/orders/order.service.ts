import { Injectable, Inject } from '@nestjs/common';
import { OrderRepository, ORDER_REPOSITORY, type OrderEntity } from './repositories/order.repository';
import { type OrderItem } from '@marketplace/contracts/models/order';
import { v4 as uuidv4 } from 'uuid';
import { OrderCreatedEvent } from './events/order.created.event';
import { type PaginatedOrdersResponse } from '@marketplace/contracts/api/orders/orders';
import { PrismaService } from '@modules/prisma/prisma.service';
import { ProductNotFoundException } from '@modules/common/errors/catalog-errors';

@Injectable()
export class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepo: OrderRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createOrder(buyerId: string, items: OrderItem[], correlationId: string): Promise<OrderEntity> {
    const verifiedItems: OrderItem[] = await Promise.all(
      items.map(async (item) => {
        const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
        if (!product || product.status !== 'ACTIVE') {
          throw new ProductNotFoundException();
        }
        return {
          productId: item.productId,
          qty: item.qty,
          price: product.price,
        };
      }),
    );

    const totalAmount = verifiedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const orderId = uuidv4();
    const event = new OrderCreatedEvent({ orderId, buyerId, items: verifiedItems, totalAmount }, correlationId);
    return this.orderRepo.create({
      id: orderId,
      buyerId,
      items: verifiedItems,
      totalAmount,
      outbox: { aggregateType: 'Order', eventType: event.eventType, payload: JSON.stringify(event.toJSON()) },
    });
  }

  async findById(id: string): Promise<OrderEntity | null> {
    return this.orderRepo.findById(id);
  }

  async findByBuyerId(buyerId: string, limit: number, offset: number): Promise<PaginatedOrdersResponse> {
    const [orders, count] = await Promise.all([
      this.orderRepo.findByBuyerId(buyerId, limit, offset),
      this.orderRepo.countByBuyerId ? this.orderRepo.countByBuyerId(buyerId) : Promise.resolve(0),
    ]);
    return {
      items: orders,
      total: count > 0 ? count : orders.length,
      limit,
      offset,
    };
  }
}
