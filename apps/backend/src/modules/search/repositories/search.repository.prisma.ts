import { Injectable } from '@nestjs/common';
import { PrismaService } from '@modules/prisma/prisma.service';
import { SearchRepository, type SearchDocumentEntity } from './search.repository';
import type { ProductStatus } from '@marketplace/contracts/models';

@Injectable()
export class PrismaSearchRepository implements SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: {
    productId: string;
    title: string;
    description?: string;
    price: number;
    categoryId: string;
    sellerId: string;
    status: 'ACTIVE' | 'ARCHIVED';
    occurredAt: Date;
  }): Promise<void> {
    await this.prisma.searchDocument.upsert({
      where: { productId: data.productId },
      update: {
        title: data.title,
        description: data.description,
        price: data.price,
        categoryId: data.categoryId,
        sellerId: data.sellerId,
        status: data.status,
        occurredAt: data.occurredAt,
      },
      create: {
        productId: data.productId,
        title: data.title,
        description: data.description,
        price: data.price,
        categoryId: data.categoryId,
        sellerId: data.sellerId,
        status: data.status,
        occurredAt: data.occurredAt,
      },
    });
  }

  async remove(productId: string): Promise<void> {
    await this.prisma.searchDocument.delete({ where: { productId } }).catch(() => {});
  }

  async search(filters: {
    q?: string;
    categoryId?: string;
    priceMin?: number;
    priceMax?: number;
    sellerId?: string;
    cursor?: string;
    limit: number;
  }): Promise<{ items: SearchDocumentEntity[]; nextCursor?: string }> {
    const where: Record<string, unknown> = { status: 'ACTIVE' };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.sellerId) where.sellerId = filters.sellerId;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      where.price = {};
      if (filters.priceMin !== undefined) (where.price as Record<string, number>).gte = filters.priceMin;
      if (filters.priceMax !== undefined) (where.price as Record<string, number>).lte = filters.priceMax;
    }
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.searchDocument.findMany({
      where,
      ...(filters.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
      take: filters.limit + 1,
      orderBy: { occurredAt: 'desc' },
    });

    let nextCursor: string | undefined;
    if (items.length > filters.limit) {
      const last = items.pop();
      nextCursor = last!.id;
    }
    return {
      items: items.map((doc) => ({
        id: doc.id,
        productId: doc.productId,
        title: doc.title,
        description: doc.description,
        price: doc.price,
        categoryId: doc.categoryId,
        sellerId: doc.sellerId,
        status: doc.status as ProductStatus,
        occurredAt: doc.occurredAt,
      })),
      nextCursor,
    };
  }

  async reindex(products: Array<{
    id: string;
    title: string;
    description: string | null;
    price: number;
    categoryId: string;
    sellerId: string;
    status: 'ACTIVE' | 'ARCHIVED';
    updatedAt: Date;
  }>): Promise<void> {
    await this.prisma.$transaction(
      products.map((p) =>
        this.prisma.searchDocument.upsert({
          where: { productId: p.id },
          update: {
            title: p.title,
            description: p.description,
            price: p.price,
            categoryId: p.categoryId,
            sellerId: p.sellerId,
            status: p.status,
            occurredAt: p.updatedAt,
          },
          create: {
            productId: p.id,
            title: p.title,
            description: p.description,
            price: p.price,
            categoryId: p.categoryId,
            sellerId: p.sellerId,
            status: p.status,
            occurredAt: p.updatedAt,
          },
        }),
      ),
    );
  }
}
