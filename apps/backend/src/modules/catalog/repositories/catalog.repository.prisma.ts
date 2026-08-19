import { Injectable } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { CategoryRepository, ProductRepository, type CategoryEntity, type CategoryTree, type ProductEntity } from './catalog.repository';
import type { ProductStatus } from '@marketplace/contracts/models';

@Injectable()
export class PrismaCatalogRepository implements CategoryRepository, ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(data: { title: string; parentId?: string | null }): Promise<CategoryEntity> {
    const category = await this.prisma.category.create({
      data: {
        title: data.title,
        parentId: data.parentId ?? null,
      },
    });
    return {
      id: category.id,
      parentId: category.parentId,
      title: category.title,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  async findCategoryById(id: string): Promise<CategoryEntity | null> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) return null;
    return {
      id: category.id,
      parentId: category.parentId,
      title: category.title,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  async findAllCategories(query?: string): Promise<CategoryEntity[]> {
    const categories = await this.prisma.category.findMany({
      ...(query ? { where: { title: { contains: query, mode: 'insensitive' } } } : {}),
      orderBy: { title: 'asc' },
    });
    return categories.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  buildTree(categories: CategoryEntity[]): CategoryTree[] {
    const map = new Map<string, CategoryTree>();
    const roots: CategoryTree[] = [];
    for (const c of categories) {
      map.set(c.id, { ...c, children: [] });
    }
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  getDepth(node: CategoryTree): number {
    if (node.children.length === 0) return 1;
    return 1 + Math.max(...node.children.map((child) => this.getDepth(child)));
  }

  async createProduct(data: {
    sellerId: string;
    categoryId: string;
    title: string;
    description?: string;
    price: number;
    currency: string;
  }): Promise<ProductEntity> {
    const product = await this.prisma.product.create({
      data: {
        sellerId: data.sellerId,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        price: data.price,
        currency: data.currency,
        status: 'ACTIVE',
      },
    });
    return this.mapProduct(product);
  }

  async findProductById(id: string): Promise<ProductEntity | null> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) return null;
    return this.mapProduct(product);
  }

  async findProductsByIds(ids: string[]): Promise<ProductEntity[]> {
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
    });
    return products.map((p) => this.mapProduct(p));
  }

  async updateProduct(id: string, data: {
    title?: string;
    description?: string;
    price?: number;
    currency?: string;
    categoryId?: string;
    status?: ProductStatus;
  }): Promise<ProductEntity> {
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
    return this.mapProduct(product);
  }

  async archiveProduct(id: string): Promise<ProductEntity> {
    const product = await this.prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    return this.mapProduct(product);
  }

  async findAllProducts(filters?: {
    categoryId?: string;
    sellerId?: string;
    status?: ProductStatus;
    cursor?: string;
    limit?: number;
    offset?: number;
  }): Promise<ProductEntity[]> {
    const where: Record<string, unknown> = {};
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.sellerId) where.sellerId = filters.sellerId;
    if (filters?.status) where.status = filters.status;

    const products = await this.prisma.product.findMany({
      where,
      ...(filters?.cursor ? { skip: 1, cursor: { id: filters.cursor } } : { skip: filters?.offset }),
      take: filters?.limit ?? 20,
      orderBy: { createdAt: 'desc' },
    });
    return products.map((p) => this.mapProduct(p));
  }

  private mapProduct(product: {
    id: string;
    sellerId: string;
    categoryId: string;
    title: string;
    description: string | null;
    price: number;
    currency: string;
    status: ProductStatus;
    createdAt: Date;
    updatedAt: Date;
  }): ProductEntity {
    return {
      id: product.id,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      title: product.title,
      description: product.description,
      price: product.price,
      currency: product.currency,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
