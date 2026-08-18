import { Injectable } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { InventoryRepository } from './inventory.repository';
import type { Stock } from '@marketplace/contracts/models/stock';

@Injectable()
export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getStock(productId: string): Promise<Stock | null> {
    const stock = await this.prisma.stock.findUnique({ where: { productId } });
    if (!stock) {
      return {
        productId,
        onHand: 0,
        reserved: 0,
        available: 0,
      };
    }
    return {
      productId: stock.productId,
      onHand: stock.onHand,
      reserved: stock.reserved,
      available: Math.max(0, stock.onHand - stock.reserved),
    };
  }

  async setStock(productId: string, onHand: number): Promise<Stock> {
    const stock = await this.prisma.stock.upsert({
      where: { productId },
      update: { onHand },
      create: { productId, onHand, reserved: 0 },
    });
    return {
      productId: stock.productId,
      onHand: stock.onHand,
      reserved: stock.reserved,
      available: Math.max(0, stock.onHand - stock.reserved),
    };
  }

  async reserveStock(sagaId: string, items: Array<{ productId: string; qty: number }>): Promise<{ success: boolean; shortages?: Array<{ productId: string; requested: number; available: number }> }> {
    const shortages: Array<{ productId: string; requested: number; available: number }> = [];

    for (const item of items) {
      const stock = await this.prisma.stock.findUnique({ where: { productId: item.productId } });
      const currentOnHand = stock?.onHand ?? 0;
      const currentReserved = stock?.reserved ?? 0;
      const available = currentOnHand - currentReserved;

      if (available < item.qty) {
        shortages.push({
          productId: item.productId,
          requested: item.qty,
          available: Math.max(0, available),
        });
      }
    }

    if (shortages.length > 0) {
      return { success: false, shortages };
    }

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.reservation.create({
          data: {
            sagaId,
            productId: item.productId,
            qty: item.qty,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        }),
      ),
    );

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.stock.update({
          where: { productId: item.productId },
          data: { reserved: { increment: item.qty } },
        }),
      ),
    );

    return { success: true };
  }

  async releaseStock(sagaId: string): Promise<void> {
    const reservations = await this.prisma.reservation.findMany({ where: { sagaId } });

    if (reservations.length === 0) {
      return;
    }

    const productQtys = new Map<string, number>();
    for (const r of reservations) {
      productQtys.set(r.productId, (productQtys.get(r.productId) ?? 0) + r.qty);
    }

    await this.prisma.$transaction(
      Array.from(productQtys.entries()).map(([productId, qty]) =>
        this.prisma.stock.update({
          where: { productId },
          data: { reserved: { decrement: qty } },
        }),
      ),
    );

    await this.prisma.reservation.deleteMany({ where: { sagaId } });
  }

  async confirmStock(sagaId: string, items: Array<{ productId: string; qty: number }>): Promise<void> {
    const reservations = await this.prisma.reservation.findMany({ where: { sagaId } });
    if (reservations.length === 0) return;

    const reservedByProduct = new Map<string, number>();
    for (const r of reservations) {
      reservedByProduct.set(r.productId, (reservedByProduct.get(r.productId) ?? 0) + r.qty);
    }

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.stock.update({
          where: { productId: item.productId },
          data: {
            onHand: { decrement: item.qty },
            reserved: { decrement: reservedByProduct.get(item.productId) ?? 0 },
          },
        }),
      ),
    );

    await this.prisma.reservation.deleteMany({ where: { sagaId } });
  }

  async getStocks(productIds: string[]): Promise<Stock[]> {
    const stocks = await this.prisma.stock.findMany({
      where: { productId: { in: productIds } },
    });
    const stockMap = new Map(stocks.map((s) => [s.productId, s]));

    return productIds.map((productId) => {
      const stock = stockMap.get(productId);
      if (!stock) {
        return {
          productId,
          onHand: 0,
          reserved: 0,
          available: 0,
        };
      }
      return {
        productId: stock.productId,
        onHand: stock.onHand,
        reserved: stock.reserved,
        available: Math.max(0, stock.onHand - stock.reserved),
      };
    });
  }

  async releaseExpiredReservations(): Promise<number> {
    const now = new Date();
    const expired = await this.prisma.reservation.findMany({
      where: { expiresAt: { lte: now } },
    });

    if (expired.length === 0) {
      return 0;
    }

    const productQtys = new Map<string, number>();
    const expiredIds: string[] = [];
    for (const r of expired) {
      productQtys.set(r.productId, (productQtys.get(r.productId) ?? 0) + r.qty);
      expiredIds.push(r.id);
    }

    await this.prisma.$transaction(
      Array.from(productQtys.entries()).map(([productId, qty]) =>
        this.prisma.stock.update({
          where: { productId },
          data: { reserved: { decrement: qty } },
        }),
      ),
    );

    await this.prisma.reservation.deleteMany({ where: { id: { in: expiredIds } } });

    return expired.length;
  }
}
