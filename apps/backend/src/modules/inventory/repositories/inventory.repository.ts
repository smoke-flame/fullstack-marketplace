import type { Stock } from '@marketplace/contracts/models/stock';

export interface InventoryRepository {
  getStock(productId: string): Promise<Stock | null>;
  setStock(productId: string, onHand: number): Promise<Stock>;
  reserveStock(sagaId: string, items: Array<{ productId: string; qty: number }>): Promise<{ success: boolean; shortages?: Array<{ productId: string; requested: number; available: number }> }>;
  releaseStock(sagaId: string): Promise<void>;
  confirmStock(sagaId: string, items: Array<{ productId: string; qty: number }>): Promise<void>;
  getStocks(productIds: string[]): Promise<Stock[]>;
  releaseExpiredReservations(): Promise<number>;
}

export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY');
