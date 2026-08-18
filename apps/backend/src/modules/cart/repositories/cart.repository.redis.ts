import { Injectable } from '@nestjs/common';
import { RedisService } from '@modules/redis/redis.service';
import { CartRepository } from './cart.repository';

@Injectable()
export class RedisCartRepository implements CartRepository {
  constructor(private readonly redis: RedisService) {}

  private key(userId: string): string {
    return `cart:${userId}`;
  }

  async getCart(userId: string): Promise<import('@marketplace/contracts/api/cart/cart').CartResponse | null> {
    const raw = await this.redis.client.get(this.key(userId));
    if (!raw) return null;
    return JSON.parse(raw) as import('@marketplace/contracts/api/cart/cart').CartResponse;
  }

  async setCart(userId: string, cart: import('@marketplace/contracts/api/cart/cart').CartResponse, ttlSeconds: number): Promise<void> {
    await this.redis.client.set(this.key(userId), JSON.stringify(cart), 'EX', ttlSeconds);
  }

  async invalidateProduct(productId: string, currentPrice?: number, unavailable = false): Promise<void> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.client.scan(cursor, 'MATCH', 'cart:*', 'COUNT', 100);
      cursor = nextCursor;
      for (const key of keys) {
        const raw = await this.redis.client.get(key);
        if (!raw) continue;
        const cart = JSON.parse(raw) as import('@marketplace/contracts/api/cart/cart').CartResponse;
        const item = cart.items.find((entry) => entry.productId === productId);
        if (!item) continue;

        item.unavailable = unavailable;
        if (currentPrice !== undefined) {
          item.currentPrice = currentPrice;
          item.priceChanged = item.snapshot.price !== currentPrice;
        }
        await this.redis.client.set(key, JSON.stringify(cart), 'EX', 30 * 24 * 60 * 60);
      }
    } while (cursor !== '0');
  }
}
