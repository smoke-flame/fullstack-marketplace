import type { CartResponse } from '@marketplace/contracts/api/cart/cart';

export interface CartRepository {
  getCart(userId: string): Promise<CartResponse | null>;
  setCart(userId: string, cart: CartResponse, ttlSeconds: number): Promise<void>;
  invalidateProduct(productId: string, currentPrice?: number, unavailable?: boolean): Promise<void>;
}

export const CART_REPOSITORY = Symbol('CART_REPOSITORY');
