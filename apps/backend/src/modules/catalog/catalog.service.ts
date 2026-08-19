import { Injectable, Inject } from '@nestjs/common';
import { CategoryRepository, ProductRepository, CATEGORY_REPOSITORY, PRODUCT_REPOSITORY, type CategoryEntity, type ProductEntity } from './repositories/catalog.repository';
import { CategoryNotFoundException, CategoryDepthExceededException, ProductNotFoundException, ProductForbiddenException } from '@modules/common/errors/catalog-errors';
import { type CreateCategoryRequest } from '@marketplace/contracts/api/catalog/categories';
import { type CreateProductRequest, type UpdateProductRequest, type BatchProductsRequest, type BatchProductsResponse, productResponseSchema, type PaginatedProductsResponse } from '@marketplace/contracts/api/catalog/products';
import type { ProductStatus } from '@marketplace/contracts/models';
import { USER_REPOSITORY, UserRepository } from '@modules/users/user.repository';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: CategoryRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
  ) {}

  async createCategory(data: CreateCategoryRequest): Promise<{ id: string; parentId: string | null; title: string }> {
    if (data.parentId) {
      const parent = await this.categoryRepo.findCategoryById(data.parentId);
      if (!parent) {
        throw new CategoryNotFoundException();
      }
      const tree = this.categoryRepo.buildTree([parent]);
      if (this.categoryRepo.getDepth(tree[0]) >= 2) {
        throw new CategoryDepthExceededException();
      }
    }
    const category = await this.categoryRepo.createCategory({ title: data.title, parentId: data.parentId ?? null });
    return { id: category.id, parentId: category.parentId, title: category.title };
  }

  async findCategoryById(id: string): Promise<{ id: string; parentId: string | null; title: string; children: CategoryEntity[] } | null> {
    const category = await this.categoryRepo.findCategoryById(id);
    if (!category) return null;
    const tree = this.categoryRepo.buildTree([category]);
    return tree[0];
  }

  async findAllCategories(query?: string) {
    const categories = await this.categoryRepo.findAllCategories(query);
    return this.categoryRepo.buildTree(categories);
  }

  async createProduct(sellerId: string, data: CreateProductRequest): Promise<ProductEntity> {
    const category = await this.categoryRepo.findCategoryById(data.categoryId);
    if (!category) {
      throw new CategoryNotFoundException();
    }
    return this.productRepo.createProduct({
      sellerId,
      categoryId: data.categoryId,
      title: data.title,
      description: data.description,
      price: data.price,
      currency: data.currency ?? 'UAH',
    });
  }

  async findProductById(id: string): Promise<ProductEntity | null> {
    return this.productRepo.findProductById(id);
  }

  async findProductDetails(id: string) {
    const product = await this.productRepo.findProductById(id);
    if (!product) return null;
    const [category, seller] = await Promise.all([
      this.categoryRepo.findCategoryById(product.categoryId),
      this.userRepo.findById(product.sellerId),
    ]);
    return {
      ...product,
      categoryTitle: category?.title,
      sellerEmail: seller?.email,
    };
  }

  async findProductsByIds(ids: string[]): Promise<ProductEntity[]> {
    return this.productRepo.findProductsByIds(ids);
  }

  async findAllProducts(filters?: {
    categoryId?: string;
    sellerId?: string;
    status?: ProductStatus;
    cursor?: string;
    limit?: number;
    offset?: number;
  }): Promise<ProductEntity[] | PaginatedProductsResponse> {
    const where: Record<string, unknown> = {};
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.sellerId) where.sellerId = filters.sellerId;
    if (filters?.status) where.status = filters.status;

    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;

    const products = await this.productRepo.findAllProducts({
      ...filters,
      limit,
      offset,
    });

    return {
      items: products,
      total: products.length,
      limit,
      offset,
    };
  }

  async updateProduct(id: string, sellerId: string, data: UpdateProductRequest): Promise<ProductEntity> {
    const product = await this.productRepo.findProductById(id);
    if (!product) {
      throw new ProductNotFoundException();
    }
    if (product.sellerId !== sellerId) {
      throw new ProductForbiddenException();
    }
    if (data.categoryId) {
      const category = await this.categoryRepo.findCategoryById(data.categoryId);
      if (!category) {
        throw new CategoryNotFoundException();
      }
    }
    return this.productRepo.updateProduct(id, {
      title: data.title,
      description: data.description,
      price: data.price,
      currency: data.currency,
      categoryId: data.categoryId,
      status: data.status,
    });
  }

  async archiveProduct(id: string, sellerId: string): Promise<ProductEntity> {
    const product = await this.productRepo.findProductById(id);
    if (!product) {
      throw new ProductNotFoundException();
    }
    if (product.sellerId !== sellerId) {
      throw new ProductForbiddenException();
    }
    return this.productRepo.archiveProduct(id);
  }

  async batchProducts(request: BatchProductsRequest): Promise<BatchProductsResponse> {
    const products = await this.productRepo.findProductsByIds(request.ids);
    const foundIds = new Set(products.map((p) => p.id));
    const missing = request.ids.filter((id) => !foundIds.has(id));
    return {
      products: products.map((p) => productResponseSchema.parse({
        id: p.id,
        sellerId: p.sellerId,
        categoryId: p.categoryId,
        title: p.title,
        description: p.description,
        price: p.price,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      missing,
    };
  }
}
