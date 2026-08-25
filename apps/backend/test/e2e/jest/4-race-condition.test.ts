import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { InventoryService } from '@modules/inventory/inventory.service';
import { PrismaService } from '@modules/prisma/prisma.service';
import { PrismaInventoryRepository } from '@modules/inventory/repositories/inventory.repository.prisma';
import { INVENTORY_REPOSITORY } from '@modules/inventory/repositories/inventory.repository';

describe('Inventory reserve race condition (Jest)', () => {
  let moduleRef: TestingModule;
  let inventoryService: InventoryService;
  let prisma: PrismaService;
  let testProductId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        InventoryService,
        PrismaInventoryRepository,
        { provide: INVENTORY_REPOSITORY, useClass: PrismaInventoryRepository },
      ],
    }).compile();

    inventoryService = moduleRef.get(InventoryService);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    testProductId = `test-product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await prisma.stock.create({
      data: { productId: testProductId, onHand: 1, reserved: 0 },
    });
  });

  afterEach(async () => {
    await prisma.reservation.deleteMany({ where: { productId: testProductId } });
    await prisma.stock.deleteMany({ where: { productId: testProductId } });
  });

  it('ensures only one reserve succeeds when stock is 1 and two buyers reserve simultaneously', async () => {
    const sagaId1 = `saga-${Date.now()}-1`;
    const sagaId2 = `saga-${Date.now()}-2`;

    const [result1, result2] = await Promise.all([
      inventoryService.reserveStock(sagaId1, [{ productId: testProductId, qty: 1 }]),
      inventoryService.reserveStock(sagaId2, [{ productId: testProductId, qty: 1 }]),
    ]);

    const successes = [result1, result2].filter((r) => r.success);
    const failures = [result1, result2].filter((r) => !r.success);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    const failure = failures[0];
    if (failure.shortages) {
      expect(failure.shortages).toHaveLength(1);
      expect(failure.shortages[0].productId).toBe(testProductId);
      expect(failure.shortages[0].requested).toBe(1);
      expect(failure.shortages[0].available).toBeGreaterThanOrEqual(0);
    }

    const stock = await prisma.stock.findUnique({ where: { productId: testProductId } });
    expect(stock?.reserved).toBe(1);
    expect(stock?.onHand).toBe(1);
  });
});
