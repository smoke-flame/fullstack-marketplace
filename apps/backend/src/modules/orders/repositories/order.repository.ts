import type { OrderStatus, OrderItem, OrderTimelineEntry } from '@marketplace/contracts/models/order';

export interface OrderEntity {
  id: string;
  buyerId: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  timeline: OrderTimelineEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderRepository {
  create(data: { buyerId: string; items: OrderItem[]; totalAmount: number }): Promise<OrderEntity>;
  findById(id: string): Promise<OrderEntity | null>;
  findByBuyerId(buyerId: string): Promise<OrderEntity[]>;
  updateStatus(id: string, status: OrderStatus, reason?: string | null): Promise<OrderEntity>;
  addTimelineEntry(orderId: string, status: OrderStatus, reason?: string | null): Promise<void>;
  findActiveOrderForBuyer(buyerId: string): Promise<OrderEntity | null>;
}

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
