import { Injectable, Inject } from '@nestjs/common';
import { CartRepository, CART_REPOSITORY } from './repositories/cart.repository';
import { CatalogService } from '@modules/catalog/catalog.service';
import { CartLimitExceededException, CartProductUnavailableException } from '@modules/common/errors/cart-errors';

@Injectable()
export class CartService {
  private readonly ttlSeconds = 30 * 24 * 60 * 60;

  constructor(
    @Inject(CART_REPOSITORY) private readonly repo: CartRepository,
    private readonly catalogService: CatalogService,
  ) {}

  async getCart(userId: string) {
    const cart = await this.repo.getCart(userId);
    if (!cart || cart.items.length === 0) return { items: [] };

    const productIds = cart.items.map((i) => i.productId);
    const products = await this.catalogService.findProductsByIds(productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));

    const items = cart.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product || product.status === 'ARCHIVED') {
        return { ...item, priceChanged: false, unavailable: true };
      }
      const priceChanged = product.price !== item.snapshot.price;
      return { ...item, priceChanged, unavailable: false };
    });

    return { items };
  }

  async upsertItem(userId: string, productId: string, qty: number) {
    const cart = await this.repo.getCart(userId) || { items: [] };
    if (cart.items.length >= 50 && !cart.items.find((i) => i.productId === productId)) {
      throw new CartLimitExceededException();
    }
    if (qty === 0) {
      cart.items = cart.items.filter((i) => i.productId !== productId);
      await this.repo.setCart(userId, cart, this.ttlSeconds);
      return { items: cart.items };
    }
    if (qty > 99) {
      throw new CartLimitExceededException();
    }

    const product = await this.catalogService.findProductById(productId);
    if (!product || product.status === 'ARCHIVED') {
      throw new CartProductUnavailableException();
    }

    const existing = cart.items.find((i) => i.productId === productId);
    if (existing) {
      existing.qty = qty;
    } else {
      cart.items.push({
        productId,
        qty,
        snapshot: { title: product.title, price: product.price },
        priceChanged: false,
        unavailable: false,
      });
    }
    await this.repo.setCart(userId, cart, this.ttlSeconds);
    return { items: cart.items };
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.repo.getCart(userId);
    if (!cart) return { items: [] };
    cart.items = cart.items.filter((i) => i.productId !== productId);
    await this.repo.setCart(userId, cart, this.ttlSeconds);
    return { items: cart.items };
  }

  async clear(userId: string) {
    await this.repo.setCart(userId, { items: [] }, this.ttlSeconds);
    return { items: [] };
  }

  async invalidateSnapshotByProductId(): Promise<void> {
    // In Redis we can't scan all carts efficiently; snapshot invalidation is done lazily on GET /cart.
  }
}
