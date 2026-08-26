import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { CatalogService } from '@modules/catalog/catalog.service';
import { PrismaService } from '@modules/prisma/prisma.service';
import { PrismaCatalogRepository } from '@modules/catalog/repositories/catalog.repository.prisma';
import { CATEGORY_REPOSITORY, PRODUCT_REPOSITORY } from '@modules/catalog/repositories/catalog.repository';
import { SearchService } from '@modules/search/search.service';
import { PrismaSearchRepository } from '@modules/search/repositories/search.repository.prisma';
import { SEARCH_REPOSITORY } from '@modules/search/repositories/search.repository';
import { PrismaUserRepository } from '@modules/users/user.repository.prisma';
import { USER_REPOSITORY } from '@modules/users/user.repository';
import { v4 as uuidv4 } from 'uuid';

describe('Search eventual consistency (Jest)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let catalogService: CatalogService;
  let searchService: SearchService;
  let testCategoryId: string;
  let testProductId: string;
  let sellerId: string;

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
        SearchService,
        PrismaSearchRepository,
        { provide: SEARCH_REPOSITORY, useClass: PrismaSearchRepository },
      ],
    }).compile();

    catalogService = moduleRef.get(CatalogService);
    searchService = moduleRef.get(SearchService);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    testCategoryId = uuidv4();
    testProductId = uuidv4();
    sellerId = uuidv4();

    await prisma.category.create({
      data: { id: testCategoryId, title: 'Test Category', parentId: null },
    });

    await prisma.user.create({
      data: { id: sellerId, email: `seller-${Date.now()}@test.com`, roles: ['BUYER', 'SELLER'], password: 'hashed' },
    });
  });

  afterEach(async () => {
    await prisma.searchDocument.deleteMany({ where: { productId: testProductId } });
    await prisma.product.deleteMany({ where: { id: testProductId } });
    await prisma.category.deleteMany({ where: { id: testCategoryId } });
    await prisma.user.deleteMany({ where: { id: sellerId } });
  });

  it('restores search consistency via reindexAll after missed product.update event', async () => {
    const originalPrice = 100;
    const updatedPrice = 250;

    const product = await catalogService.createProduct(sellerId, {
      categoryId: testCategoryId,
      title: 'Consistency Test Product',
      description: 'Testing eventual consistency',
      price: originalPrice,
      currency: 'UAH',
    });

    testProductId = product.id;

    await searchService.indexCreated(
      {
        productId: testProductId,
        title: product.title,
        description: product.description!,
        price: originalPrice,
        currency: 'UAH',
        categoryId: testCategoryId,
        sellerId,
        status: 'ACTIVE',
      },
      new Date(),
    );

    let searchResult = await searchService.search({ q: undefined, sort: 'relevance', limit: 10, offset: 0 });
    expect(searchResult.items).toHaveLength(1);
    expect(searchResult.items[0].price).toBe(originalPrice);

    await catalogService.updateProduct(testProductId, sellerId, {
      price: updatedPrice,
    });

    const dbProduct = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(dbProduct?.price).toBe(updatedPrice);

    searchResult = await searchService.search({ q: undefined, sort: 'relevance', limit: 10, offset: 0 });
    expect(searchResult.items).toHaveLength(1);
    expect(searchResult.items[0].price).toBe(originalPrice);

    await searchService.reindexAll();

    searchResult = await searchService.search({ q: undefined, sort: 'relevance', limit: 10, offset: 0 });
    expect(searchResult.items).toHaveLength(1);
    expect(searchResult.items[0].price).toBe(updatedPrice);
  }, 120000);
});
