import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { CatalogService } from '@modules/catalog/catalog.service';
import { PrismaService } from '@modules/prisma/prisma.service';
import { PrismaCatalogRepository } from '@modules/catalog/repositories/catalog.repository.prisma';
import { CATEGORY_REPOSITORY, PRODUCT_REPOSITORY } from '@modules/catalog/repositories/catalog.repository';
import { CartService } from '@modules/cart/cart.service';
import { CartRepository, CART_REPOSITORY } from '@modules/cart/repositories/cart.repository';
import { OrderService } from '@modules/orders/order.service';
import { PrismaOrderRepository } from '@modules/orders/repositories/order.repository.prisma';
import { ORDER_REPOSITORY } from '@modules/orders/repositories/order.repository';
import { PrismaUserRepository } from '@modules/users/user.repository.prisma';
import { USER_REPOSITORY } from '@modules/users/user.repository';
import { v4 as uuidv4 } from 'uuid';

describe('Cart price change consistency (Jest)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let catalogService: CatalogService;
  let cartService: CartService;
  let orderService: OrderService;
  let testCategoryId: string;
  let testProductId: string;
  let sellerId: string;
  let buyerId: string;

  const inMemoryCarts: Map<string, { items: Array<{ productId: string; qty: number; snapshot: { title: string; price: number }; currentPrice?: number; priceChanged: boolean; unavailable: boolean }> }> = new Map();

  const mockCartRepository: CartRepository = {
    getCart: async (userId: string) => inMemoryCarts.get(userId) ?? null,
    setCart: async (userId: string, cart: any) => { inMemoryCarts.set(userId, JSON.parse(JSON.stringify(cart))); },
    invalidateProduct: async (productId: string, currentPrice?: number, unavailable = false) => {
      for (const [_userId, cart] of inMemoryCarts.entries()) {
        const item = cart.items.find((i) => i.productId === productId);
        if (!item) continue;
        item.unavailable = unavailable;
        if (currentPrice !== undefined) {
          item.currentPrice = currentPrice;
          item.priceChanged = item.snapshot.price !== currentPrice;
        }
      }
    },
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        CatalogService,
        PrismaCatalogRepository,
        { provide: CATEGORY_REPOSITORY, useClass: PrismaCatalogRepository },
        { provide: PRODUCT_REPOSITORY, useClass: PrismaCatalogRepository },
        PrismaUserRepository,
        { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
        CartService,
        { provide: CART_REPOSITORY, useValue: mockCartRepository },
        OrderService,
        PrismaOrderRepository,
        { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
      ],
    }).compile();

    catalogService = moduleRef.get(CatalogService);
    cartService = moduleRef.get(CartService);
    orderService = moduleRef.get(OrderService);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    testCategoryId = uuidv4();
    testProductId = uuidv4();
    sellerId = uuidv4();
    buyerId = uuidv4();
    inMemoryCarts.clear();

    await prisma.category.create({
      data: { id: testCategoryId, title: 'Test Category', parentId: null },
    });

    await prisma.user.create({
      data: { id: sellerId, email: `seller-${Date.now()}@test.com`, roles: ['BUYER', 'SELLER'], password: 'hashed' },
    });

    await prisma.user.create({
      data: { id: buyerId, email: `buyer-${Date.now()}@test.com`, roles: ['BUYER'], password: 'hashed' },
    });
  });

  afterEach(async () => {
    await prisma.order.deleteMany({ where: { buyerId } });
    await prisma.product.deleteMany({ where: { id: testProductId } });
    await prisma.category.deleteMany({ where: { id: testCategoryId } });
    await prisma.user.deleteMany({ where: { id: sellerId } });
    await prisma.user.deleteMany({ where: { id: buyerId } });
  });

  it('detects price change in cart and creates order with updated price', async () => {
    const originalPrice = 100;
    const updatedPrice = 250;

    const product = await catalogService.createProduct(sellerId, {
      categoryId: testCategoryId,
      title: 'Price Change Test Product',
      description: 'Testing cart price change',
      price: originalPrice,
      currency: 'UAH',
    });

    testProductId = product.id;

    await cartService.upsertItem(buyerId, testProductId, 2);

    let cart = await cartService.getCart(buyerId);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].snapshot.price).toBe(originalPrice);
    expect(cart.items[0].priceChanged).toBe(false);
    expect(cart.items[0].currentPrice).toBe(originalPrice);

    await catalogService.updateProduct(testProductId, sellerId, {
      price: updatedPrice,
    });

    const dbProduct = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(dbProduct?.price).toBe(updatedPrice);

    cart = await cartService.getCart(buyerId);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].priceChanged).toBe(true);
    expect(cart.items[0].currentPrice).toBe(updatedPrice);

    const correlationId = uuidv4();
    const order = await orderService.createOrder(
      buyerId,
      cart.items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        price: item.currentPrice ?? item.snapshot.price,
      })),
      correlationId,
    );

    expect(order.items).toHaveLength(1);
    expect(order.items[0].price).toBe(updatedPrice);
    expect(order.totalAmount).toBe(updatedPrice * 2);
  }, 120000);
});
