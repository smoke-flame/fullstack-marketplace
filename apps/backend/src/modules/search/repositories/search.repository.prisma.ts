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
    currency: string;
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
        currency: data.currency,
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
        currency: data.currency,
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
    limit: number;
    offset: number;
  }): Promise<{ items: SearchDocumentEntity[]; total: number; limit: number; offset: number }> {
    const priceMin = filters.priceMin === undefined ? undefined : Number(filters.priceMin);
    const priceMax = filters.priceMax === undefined ? undefined : Number(filters.priceMax);
    const where: Record<string, unknown> = { status: 'ACTIVE' };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.sellerId) where.sellerId = filters.sellerId;
    if (priceMin !== undefined || priceMax !== undefined) {
      where.price = {};
      if (priceMin !== undefined) (where.price as Record<string, number>).gte = priceMin;
      if (priceMax !== undefined) (where.price as Record<string, number>).lte = priceMax;
    }
    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.searchDocument.findMany({
      where,
      skip: filters.offset,
      take: filters.limit,
      orderBy: { occurredAt: 'desc' },
    });

    const [categories, sellers] = await Promise.all([
      this.prisma.category.findMany({ where: { id: { in: items.map((item) => item.categoryId) } }, select: { id: true, title: true } }),
      this.prisma.user.findMany({ where: { id: { in: items.map((item) => item.sellerId) } }, select: { id: true, email: true } }),
    ]);
    const categoryTitles = new Map(categories.map((category) => [category.id, category.title]));
    const sellerEmails = new Map(sellers.map((seller) => [seller.id, seller.email]));
    return {
      items: items.map((doc) => ({
        id: doc.id,
        productId: doc.productId,
        title: doc.title,
        description: doc.description,
        price: doc.price,
        currency: doc.currency,
        categoryId: doc.categoryId,
        sellerId: doc.sellerId,
        categoryTitle: categoryTitles.get(doc.categoryId),
        sellerEmail: sellerEmails.get(doc.sellerId),
        status: doc.status as ProductStatus,
        occurredAt: doc.occurredAt,
      })),
      total: items.length,
      limit: filters.limit,
      offset: filters.offset,
    };
  }

  async reindex(products: Array<{
    id: string;
    title: string;
    description: string | null;
    price: number;
    currency: string;
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
            currency: p.currency,
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
            currency: p.currency,
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
