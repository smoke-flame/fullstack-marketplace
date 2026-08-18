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

  async invalidateSnapshot(userId: string, productId: string): Promise<void> {
    const cart = await this.getCart(userId);
    if (!cart) return;
    const item = cart.items.find((i) => i.productId === productId);
    if (item) {
      item.priceChanged = true;
      item.unavailable = true;
      await this.setCart(userId, cart, 30 * 24 * 60 * 60);
    }
  }
}
