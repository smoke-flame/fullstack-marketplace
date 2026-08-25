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
    // The sagaId/productId uniqueness constraint is the durable duplicate
    // guard.  Keep the duplicate check, stock validation and increments in
    // one serializable transaction so concurrent commands cannot oversell.
    const quantities = new Map<string, number>();
    for (const item of items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.qty);
    const requested = [...quantities].map(([productId, qty]) => ({ productId, qty }));

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (await tx.reservation.findFirst({ where: { sagaId } })) return { success: true };

        const stocks = await tx.stock.findMany({ where: { productId: { in: requested.map((item) => item.productId) } } });
        const stockByProduct = new Map(stocks.map((stock) => [stock.productId, stock]));
        const shortages = requested.flatMap((item) => {
          const stock = stockByProduct.get(item.productId);
          const available = (stock?.onHand ?? 0) - (stock?.reserved ?? 0);
          return available < item.qty ? [{ productId: item.productId, requested: item.qty, available: Math.max(0, available) }] : [];
        });
        if (shortages.length) return { success: false, shortages };

        for (const item of requested) {
          await tx.reservation.create({ data: { sagaId, productId: item.productId, qty: item.qty, expiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
          await tx.stock.update({ where: { productId: item.productId }, data: { reserved: { increment: item.qty } } });
        }
        return { success: true };
      }, { isolationLevel: 'Serializable' });
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === 'P2002' || code === 'P2034') {
        return { success: false };
      }
      throw error;
    }
  }

  async releaseStock(sagaId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const reservations = await tx.reservation.findMany({ where: { sagaId } });
      if (!reservations.length) return;
      for (const reservation of reservations) {
        await tx.stock.update({ where: { productId: reservation.productId }, data: { reserved: { decrement: reservation.qty } } });
      }
      await tx.reservation.deleteMany({ where: { sagaId } });
    }, { isolationLevel: 'Serializable' });
  }

  async confirmStock(sagaId: string, items: Array<{ productId: string; qty: number }>): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const reservations = await tx.reservation.findMany({ where: { sagaId } });
      if (!reservations.length) return;
      const reservedByProduct = new Map(reservations.map((reservation) => [reservation.productId, reservation.qty]));
      for (const item of items) {
        await tx.stock.update({
          where: { productId: item.productId },
          data: { onHand: { decrement: item.qty }, reserved: { decrement: reservedByProduct.get(item.productId) ?? 0 } },
        });
      }
      await tx.reservation.deleteMany({ where: { sagaId } });
    }, { isolationLevel: 'Serializable' });
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
