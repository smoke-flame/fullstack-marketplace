import { Injectable, Inject } from '@nestjs/common';
import { CategoryRepository, ProductRepository, CATEGORY_REPOSITORY, PRODUCT_REPOSITORY, type CategoryEntity, type ProductEntity } from './repositories/catalog.repository';
import { CategoryNotFoundException, CategoryDepthExceededException, ProductNotFoundException, ProductForbiddenException } from '@modules/common/errors/catalog-errors';
import { type CreateCategoryRequest } from '@marketplace/contracts/api/catalog/categories';
import { type CreateProductRequest, type UpdateProductRequest, type BatchProductsRequest, type BatchProductsResponse, productResponseSchema } from '@marketplace/contracts/api/catalog/products';
import type { ProductStatus } from '@marketplace/contracts/models';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: CategoryRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: ProductRepository,
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

  async findAllCategories() {
    const categories = await this.categoryRepo.findAllCategories();
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
    });
  }

  async findProductById(id: string): Promise<ProductEntity | null> {
    return this.productRepo.findProductById(id);
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
  }): Promise<ProductEntity[]> {
    return this.productRepo.findAllProducts(filters);
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
      categoryId: data.categoryId,
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
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      missing,
    };
  }
}
