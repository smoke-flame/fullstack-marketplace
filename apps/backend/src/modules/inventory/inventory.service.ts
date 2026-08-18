import { Injectable, Inject } from '@nestjs/common';
import { InventoryRepository, INVENTORY_REPOSITORY } from './repositories/inventory.repository';
import { StockBelowReservedException } from '@modules/common/errors/inventory-errors';
import { type StockResponse } from '@marketplace/contracts/api/inventory/inventory';
import type { Stock } from '@marketplace/contracts/models/stock';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(INVENTORY_REPOSITORY) private readonly repo: InventoryRepository,
  ) {}

  async setStock(productId: string, onHand: number): Promise<StockResponse> {
    const current = await this.repo.getStock(productId);
    if (current && current.reserved > onHand) {
      throw new StockBelowReservedException();
    }
    const stock = await this.repo.setStock(productId, onHand);
    return this.mapStockResponse(stock);
  }

  async getStock(productId: string): Promise<StockResponse> {
    const stock = await this.repo.getStock(productId);
    if (!stock) {
      return {
        productId,
        onHand: 0,
        reserved: 0,
        available: 0,
      };
    }
    return this.mapStockResponse(stock);
  }

  async getStocks(productIds: string[]): Promise<StockResponse[]> {
    const stocks = await this.repo.getStocks(productIds);
    return stocks.map((s) => this.mapStockResponse(s));
  }

  async reserveStock(sagaId: string, items: Array<{ productId: string; qty: number }>): Promise<{ success: boolean; shortages?: Array<{ productId: string; requested: number; available: number }> }> {
    return this.repo.reserveStock(sagaId, items);
  }

  async releaseStock(sagaId: string): Promise<void> {
    await this.repo.releaseStock(sagaId);
  }

  async confirmStock(sagaId: string, items: Array<{ productId: string; qty: number }>): Promise<void> {
    await this.repo.confirmStock(sagaId, items);
  }

  async releaseExpired(): Promise<number> {
    return this.repo.releaseExpiredReservations();
  }

  private mapStockResponse(stock: Stock): StockResponse {
    return {
      productId: stock.productId,
      onHand: stock.onHand,
      reserved: stock.reserved,
      available: Math.max(0, stock.onHand - stock.reserved),
    };
  }
}
