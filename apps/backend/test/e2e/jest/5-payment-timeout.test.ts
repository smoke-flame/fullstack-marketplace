import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@modules/prisma/prisma.service';
import { OrderService } from '@modules/orders/order.service';
import { OrderSagaOrchestrator } from '@modules/orders/saga/order-saga.orchestrator';
import { PrismaOrderRepository } from '@modules/orders/repositories/order.repository.prisma';
import { InventoryService } from '@modules/inventory/inventory.service';
import { PrismaInventoryRepository } from '@modules/inventory/repositories/inventory.repository.prisma';
import { EventPublisher } from '@modules/rabbitmq/event-publisher';

// WARNING: These tests must run sequentially (--runInBand) because they share
// the same PostgreSQL database and saga timeout timers. Parallel execution
// causes database contention and timer interference between tests.
describe('Payment timeout resilience (Jest)', () => {
  let prisma: PrismaService;
  let orderService: OrderService;
  let inventoryService: InventoryService;
  let testProductId: string;
  let testBuyerId: string;
  let testCategoryId: string;
  const SAGA_TIMEOUT_MS = 60000;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();

    const orderRepo = new PrismaOrderRepository(prisma);
    const inventoryRepo = new PrismaInventoryRepository(prisma);
    inventoryService = new InventoryService(inventoryRepo);
    orderService = new OrderService(orderRepo, prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    testCategoryId = uuidv4();
    testProductId = `test-product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    testBuyerId = uuidv4();
    await prisma.category.create({
      data: { id: testCategoryId, title: 'Test Category', parentId: null },
    });
    await prisma.product.create({
      data: {
        id: testProductId,
        sellerId: uuidv4(),
        categoryId: testCategoryId,
        title: 'Test Product',
        price: 25,
        currency: 'UAH',
        status: 'ACTIVE',
      },
    });
    await prisma.stock.create({
      data: { productId: testProductId, onHand: 10, reserved: 0 },
    });
  });

  afterEach(async () => {
    await prisma.reservation.deleteMany({ where: { productId: testProductId } });
    await prisma.stock.deleteMany({ where: { productId: testProductId } });
    await prisma.order.deleteMany({ where: { buyerId: testBuyerId } });
    await prisma.product.deleteMany({ where: { id: testProductId } });
    await prisma.category.deleteMany({ where: { id: testCategoryId } });
    await prisma.sagaState.deleteMany({});
  });

  it('cancels order with payment_timeout when payment service crashes after receiving payment.charge', async () => {
    const correlationId = uuidv4();
    const mockEventPublisher = { publish: jest.fn() };
    const sagaOrchestrator = new OrderSagaOrchestrator(
      new PrismaOrderRepository(prisma),
      mockEventPublisher as unknown as EventPublisher,
      prisma,
    );

    const items = [{ productId: testProductId, qty: 1, price: 25 }];

    const mockPaymentService = {
      processCharge: jest.fn((_sagaId: string, _amount: number, _buyerId: string, _correlationId: string) => {
        throw new Error('Payment module crashed');
      }),
    };

    mockEventPublisher.publish.mockImplementation(async (event: any) => {
      if (event.eventType === 'inventory.reserve') {
        const reserveResult = await inventoryService.reserveStock(event.payload.sagaId, event.payload.items);
        if (reserveResult.success) {
          await sagaOrchestrator.handleInventoryReserved(event.payload.sagaId, event.correlationId);
        } else {
          await sagaOrchestrator.handleInventoryRejected(event.payload.sagaId, event.correlationId);
        }
      } else if (event.eventType === 'inventory.release') {
        await inventoryService.releaseStock(event.payload.sagaId);
      } else if (event.eventType === 'payment.charge') {
        try {
          mockPaymentService.processCharge(event.payload.sagaId, event.payload.amount, event.payload.buyerId, event.correlationId);
        } catch (error) {
          console.error('Payment module crashed, no response will be published:', error);
        }
      }
    });

    const order = await orderService.createOrder(testBuyerId, items, correlationId);
    expect(order.status).toBe('PENDING');

    await sagaOrchestrator.startSaga(order.id, items, correlationId);

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(mockPaymentService.processCharge).toHaveBeenCalledTimes(1);

    const orderAfterReserve = await orderService.findById(order.id);
    expect(orderAfterReserve!.status).toBe('RESERVED');

    await new Promise((resolve) => setTimeout(resolve, SAGA_TIMEOUT_MS + 1000));

    const finalOrder = await orderService.findById(order.id);
    expect(finalOrder).not.toBeNull();
    expect(finalOrder!.status).toBe('CANCELLED');
    const reasons = (finalOrder!.timeline ?? []).map((t: any) => t.reason).filter(Boolean);
    expect(reasons.some((r: string) => r.includes('payment') && r.endsWith('_timeout'))).toBe(true);

    const stock = await prisma.stock.findUnique({ where: { productId: testProductId } });
    expect(stock?.reserved).toBe(0);
    expect(stock?.onHand).toBe(10);
  }, 120000);
});
