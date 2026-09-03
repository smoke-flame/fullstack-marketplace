import { Injectable } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { OrderRepository, type OrderEntity } from './order.repository';
import type { OrderStatus, OrderItem, OrderTimelineEntry } from '@marketplace/contracts/models/order';

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    id: string;
    buyerId: string;
    items: OrderItem[];
    totalAmount: number;
    outbox: { aggregateType: string; eventType: string; payload: string };
  }): Promise<OrderEntity> {
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          id: data.id,
          buyerId: data.buyerId,
          totalAmount: data.totalAmount,
          status: 'PENDING',
          items: { create: data.items.map((item) => ({ productId: item.productId, qty: item.qty, price: item.price })) },
          timeline: { create: { status: 'PENDING', reason: null } },
        },
        include: { items: true, timeline: { orderBy: { occurredAt: 'asc' } } },
      });
      await tx.outbox.create({
        data: {
          aggregateType: data.outbox.aggregateType,
          aggregateId: created.id,
          eventType: data.outbox.eventType,
          payload: data.outbox.payload,
        },
      });
      return created;
    });
    return this.mapOrder(order);
  }

  async findById(id: string): Promise<OrderEntity | null> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        timeline: {
          orderBy: { occurredAt: 'asc' },
        },
      },
    });
    if (!order) return null;
    return this.mapOrder(order);
  }

  async findByBuyerId(buyerId: string, limit: number, offset: number): Promise<OrderEntity[]> {
    const orders = await this.prisma.order.findMany({
      where: { buyerId },
      include: {
        items: true,
        timeline: {
          orderBy: { occurredAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return orders.map((o) => this.mapOrder(o));
  }

  async countByBuyerId(buyerId: string): Promise<number> {
    return this.prisma.order.count({ where: { buyerId } });
  }

  async updateStatus(id: string, status: OrderStatus, reason?: string | null): Promise<OrderEntity> {
    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status,
        timeline: {
          create: {
            status,
            reason: reason ?? null,
          },
        },
      },
      include: {
        items: true,
        timeline: {
          orderBy: { occurredAt: 'asc' },
        },
      },
    });
    return this.mapOrder(order);
  }

  async addTimelineEntry(orderId: string, status: OrderStatus, reason?: string | null): Promise<void> {
    await this.prisma.orderTimeline.create({
      data: {
        orderId,
        status,
        reason: reason ?? null,
      },
    });
  }

  async findActiveOrderForBuyer(buyerId: string): Promise<OrderEntity | null> {
    const order = await this.prisma.order.findFirst({
      where: {
        buyerId,
        status: {
          in: ['PENDING', 'RESERVED', 'COMPLETED'],
        },
      },
      include: {
        items: true,
        timeline: {
          orderBy: { occurredAt: 'asc' },
        },
      },
    });
    if (!order) return null;
    return this.mapOrder(order);
  }

  private mapOrder(order: {
    id: string;
    buyerId: string;
    status: OrderStatus;
    totalAmount: number;
    items: { id: string; productId: string; qty: number; price: number }[];
    timeline: { id: string; status: OrderStatus; reason: string | null; occurredAt: Date }[];
    createdAt: Date;
    updatedAt: Date;
  }): OrderEntity {
    return {
      id: order.id,
      buyerId: order.buyerId,
      status: order.status,
      totalAmount: order.totalAmount,
      items: order.items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        price: item.price,
      })),
      timeline: order.timeline.map((t) => ({
        status: t.status,
        occurredAt: t.occurredAt,
        reason: t.reason as OrderTimelineEntry['reason'],
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
