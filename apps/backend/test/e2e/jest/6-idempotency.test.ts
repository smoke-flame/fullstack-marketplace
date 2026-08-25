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
describe('Saga idempotency (Jest)', () => {
  let prisma: PrismaService;
  let orderService: OrderService;
  let inventoryService: InventoryService;
  let testProductId: string;
  let testBuyerId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();

    const orderRepo = new PrismaOrderRepository(prisma);
    const inventoryRepo = new PrismaInventoryRepository(prisma);
    inventoryService = new InventoryService(inventoryRepo);
    orderService = new OrderService(orderRepo);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    jest.clearAllTimers();
    testProductId = `test-product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    testBuyerId = uuidv4();
    await prisma.stock.create({
      data: { productId: testProductId, onHand: 10, reserved: 0 },
    });
  });

  afterEach(async () => {
    await prisma.reservation.deleteMany({ where: { productId: testProductId } });
    await prisma.stock.deleteMany({ where: { productId: testProductId } });
    await prisma.order.deleteMany({ where: { buyerId: testBuyerId } });
    await prisma.sagaState.deleteMany({});
  });

  it('does not double-process inventory.reserved for the same sagaId/correlationId', async () => {
    const mockEventPublisher = { publish: jest.fn() };
    const sagaOrchestrator = new OrderSagaOrchestrator(
      new PrismaOrderRepository(prisma),
      mockEventPublisher as unknown as EventPublisher,
      prisma,
    );
    const items = [{ productId: testProductId, qty: 1, price: 25 }];
    const correlationId = uuidv4();

    mockEventPublisher.publish.mockImplementation(async (event: any) => {
      if (event.eventType === 'inventory.reserve') {
        const reserveResult = await inventoryService.reserveStock(event.payload.sagaId, event.payload.items);
        if (reserveResult.success) {
          await sagaOrchestrator.handleInventoryReserved(event.payload.sagaId, event.correlationId);
        } else {
          await sagaOrchestrator.handleInventoryRejected(event.payload.sagaId, event.correlationId);
        }
      }
    });

    const order = await orderService.createOrder(testBuyerId, items, correlationId);
    expect(order.status).toBe('PENDING');

    await sagaOrchestrator.startSaga(order.id, items, correlationId);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const orderAfterFirst = await orderService.findById(order.id);
    expect(orderAfterFirst).not.toBeNull();
    expect(orderAfterFirst!.status).toBe('RESERVED');

    const publishedBeforeReplay = mockEventPublisher.publish.mock.calls.filter((c: any) => c[0]?.eventType === 'payment.charge').length;

    await sagaOrchestrator.handleInventoryReserved(order.id, correlationId);

    const orderAfterReplay = await orderService.findById(order.id);
    expect(orderAfterReplay).not.toBeNull();
    expect(orderAfterReplay!.status).toBe('RESERVED');

    const publishedAfterReplay = mockEventPublisher.publish.mock.calls.filter((c: any) => c[0]?.eventType === 'payment.charge').length;
    expect(publishedAfterReplay).toBe(publishedBeforeReplay);
  }, 120000);

  it('does not double-process payment.succeeded for the same sagaId/correlationId', async () => {
    const mockEventPublisher = { publish: jest.fn() };
    const sagaOrchestrator = new OrderSagaOrchestrator(
      new PrismaOrderRepository(prisma),
      mockEventPublisher as unknown as EventPublisher,
      prisma,
    );
    const items = [{ productId: testProductId, qty: 1, price: 25 }];
    const correlationId = uuidv4();

    mockEventPublisher.publish.mockImplementation(async (event: any) => {
      if (event.eventType === 'inventory.reserve') {
        const reserveResult = await inventoryService.reserveStock(event.payload.sagaId, event.payload.items);
        if (reserveResult.success) {
          await sagaOrchestrator.handleInventoryReserved(event.payload.sagaId, event.correlationId);
        } else {
          await sagaOrchestrator.handleInventoryRejected(event.payload.sagaId, event.correlationId);
        }
      } else if (event.eventType === 'payment.charge') {
        await sagaOrchestrator.handlePaymentSucceeded(event.payload.sagaId, correlationId);
      }
    });

    const order = await orderService.createOrder(testBuyerId, items, correlationId);
    await sagaOrchestrator.startSaga(order.id, items, correlationId);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const orderAfterSucceeded = await orderService.findById(order.id);
    expect(orderAfterSucceeded).not.toBeNull();
    expect(orderAfterSucceeded!.status).toBe('COMPLETED');

    const publishedBeforeReplay = mockEventPublisher.publish.mock.calls.filter((c: any) => c[0]?.eventType === 'order.completed').length;

    await sagaOrchestrator.handlePaymentSucceeded(order.id, correlationId);

    const orderAfterReplay = await orderService.findById(order.id);
    expect(orderAfterReplay).not.toBeNull();
    expect(orderAfterReplay!.status).toBe('COMPLETED');

    const publishedAfterReplay = mockEventPublisher.publish.mock.calls.filter((c: any) => c[0]?.eventType === 'order.completed').length;
    expect(publishedAfterReplay).toBe(publishedBeforeReplay);
  }, 120000);

  it('does not double-process step timeout for the same sagaId/correlationId', async () => {
    const mockEventPublisher = { publish: jest.fn() };
    const sagaOrchestrator = new OrderSagaOrchestrator(
      new PrismaOrderRepository(prisma),
      mockEventPublisher as unknown as EventPublisher,
      prisma,
    );
    const items = [{ productId: testProductId, qty: 1, price: 25 }];
    const correlationId = uuidv4();

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
      }
    });

    const order = await orderService.createOrder(testBuyerId, items, correlationId);
    await sagaOrchestrator.startSaga(order.id, items, correlationId);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const orderAfterReserve = await orderService.findById(order.id);
    expect(orderAfterReserve).not.toBeNull();
    expect(orderAfterReserve!.status).toBe('RESERVED');

    const publishedBeforeReplay = mockEventPublisher.publish.mock.calls.filter((c: any) => c[0]?.eventType === 'order.cancelled').length;

    await sagaOrchestrator.handleStepTimeout(order.id);

    const orderAfterFirstTimeout = await orderService.findById(order.id);
    expect(orderAfterFirstTimeout).not.toBeNull();
    expect(orderAfterFirstTimeout!.status).toBe('CANCELLED');

    const publishedAfterFirstTimeout = mockEventPublisher.publish.mock.calls.filter((c: any) => c[0]?.eventType === 'order.cancelled').length;
    expect(publishedAfterFirstTimeout).toBe(publishedBeforeReplay + 1);

    await sagaOrchestrator.handleStepTimeout(order.id);

    const orderAfterReplay = await orderService.findById(order.id);
    expect(orderAfterReplay).not.toBeNull();
    expect(orderAfterReplay!.status).toBe('CANCELLED');

    const publishedAfterReplay = mockEventPublisher.publish.mock.calls.filter((c: any) => c[0]?.eventType === 'order.cancelled').length;
    expect(publishedAfterReplay).toBe(publishedBeforeReplay + 1);
  }, 120000);
});
