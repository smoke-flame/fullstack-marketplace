import type { ProductStatus } from '@marketplace/contracts/models';

export interface CategoryEntity {
  id: string;
  parentId: string | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryTree extends CategoryEntity {
  children: CategoryTree[];
}

export interface CategoryRepository {
  createCategory(data: { title: string; parentId?: string | null }): Promise<CategoryEntity>;
  findCategoryById(id: string): Promise<CategoryEntity | null>;
  findAllCategories(): Promise<CategoryEntity[]>;
  buildTree(categories: CategoryEntity[]): CategoryTree[];
  getDepth(node: CategoryTree): number;
}

export interface ProductEntity {
  id: string;
  sellerId: string;
  categoryId: string;
  title: string;
  description: string | null;
  price: number;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductRepository {
  createProduct(data: {
    sellerId: string;
    categoryId: string;
    title: string;
    description?: string;
    price: number;
  }): Promise<ProductEntity>;
  findProductById(id: string): Promise<ProductEntity | null>;
  findProductsByIds(ids: string[]): Promise<ProductEntity[]>;
  updateProduct(id: string, data: {
    title?: string;
    description?: string;
    price?: number;
    categoryId?: string;
    status?: ProductStatus;
  }): Promise<ProductEntity>;
  archiveProduct(id: string): Promise<ProductEntity>;
  findAllProducts(filters?: {
    categoryId?: string;
    sellerId?: string;
    status?: ProductStatus;
    cursor?: string;
    limit?: number;
  }): Promise<ProductEntity[]>;
}

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
