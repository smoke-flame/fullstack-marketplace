import { Injectable, Inject } from '@nestjs/common';
import { SearchRepository, SEARCH_REPOSITORY } from './repositories/search.repository';
import type { SearchDocumentEntity } from './repositories/search.repository';
import type { SearchRequest, SearchResponse } from '@marketplace/contracts/api/search/search';
import { CatalogService } from '@modules/catalog/catalog.service';

@Injectable()
export class SearchService {
  constructor(
    @Inject(SEARCH_REPOSITORY) private readonly repo: SearchRepository,
    private readonly catalogService: CatalogService,
  ) {}

  async search(filters: SearchRequest): Promise<SearchResponse> {
    const result = await this.repo.search({
      q: filters.q,
      categoryId: filters.categoryId,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      sellerId: filters.sellerId,
      cursor: filters.cursor,
      limit: filters.limit,
    });
    return {
      items: result.items.map((item) => ({
        productId: item.productId,
        title: item.title,
        price: item.price,
        categoryId: item.categoryId,
        sellerId: item.sellerId,
      })),
      nextCursor: result.nextCursor,
    };
  }

  async reindexAll(): Promise<void> {
    const batchSize = 100;
    let cursor: string | undefined;
    let hasMore = true;
    const all: SearchDocumentEntity[] = [];

    while (hasMore) {
      const products = await this.catalogService.findAllProducts({ status: 'ACTIVE', limit: batchSize, cursor });
      if (products.length === 0) {
        hasMore = false;
        break;
      }
      const docs: SearchDocumentEntity[] = products.map((p) => ({
        id: p.id,
        productId: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        categoryId: p.categoryId,
        sellerId: p.sellerId,
        status: p.status,
        occurredAt: p.updatedAt,
      }));
      all.push(...docs);
      cursor = products[products.length - 1].id;
      if (products.length < batchSize) hasMore = false;
    }

    await this.repo.reindex(
      all.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        categoryId: p.categoryId,
        sellerId: p.sellerId,
        status: p.status,
        updatedAt: p.occurredAt,
      })),
    );
  }

  async indexCreated(payload: { productId: string; title: string; price: number; categoryId: string; sellerId: string; status: string }, occurredAt: Date): Promise<void> {
    await this.repo.upsert({
      productId: payload.productId,
      title: payload.title,
      price: payload.price,
      categoryId: payload.categoryId,
      sellerId: payload.sellerId,
      status: payload.status as 'ACTIVE' | 'ARCHIVED',
      occurredAt,
    });
  }

  async indexUpdated(payload: { productId: string; title: string; description: string; price: number; categoryId: string; sellerId: string; status: string }, occurredAt: Date): Promise<void> {
    const existing = await this.repo.search({ q: undefined, limit: 1 });
    const doc = existing.items.find((item) => item.productId === payload.productId);
    if (doc && occurredAt <= doc.occurredAt) return;
    await this.repo.upsert({
      productId: payload.productId,
      title: payload.title,
      description: payload.description,
      price: payload.price,
      categoryId: payload.categoryId,
      sellerId: payload.sellerId,
      status: payload.status as 'ACTIVE' | 'ARCHIVED',
      occurredAt,
    });
    if (payload.status === 'ARCHIVED') {
      await this.repo.remove(payload.productId);
    }
  }

  async indexArchived(payload: { productId: string }): Promise<void> {
    await this.repo.remove(payload.productId);
  }
}
