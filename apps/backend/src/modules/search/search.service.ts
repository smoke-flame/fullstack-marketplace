import { Injectable, Inject } from '@nestjs/common';
import { SearchRepository, SEARCH_REPOSITORY } from './repositories/search.repository';
import type { SearchDocumentEntity } from './repositories/search.repository';
import type { SearchRequest, SearchResponse } from '@marketplace/contracts/api/search/search';
import { CatalogService } from '@modules/catalog/catalog.service';
import type { ProductCreatedPayload } from '@marketplace/contracts/events/catalog/product-created';
import type { ProductUpdatedPayload } from '@marketplace/contracts/events/catalog/product-updated';

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
      sort: filters.sort,
      limit: filters.limit,
      offset: filters.offset,
    });

    return {
      items: result.items.map((item) => ({
        productId: item.productId,
        title: item.title,
        price: item.price,
        currency: item.currency,
        categoryId: item.categoryId,
        sellerId: item.sellerId,
        categoryTitle: item.categoryTitle ?? item.categoryId,
        sellerEmail: item.sellerEmail ?? item.sellerId,
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }

  async reindexAll(): Promise<void> {
    const batchSize = 100;
    let offset = 0;
    let hasMore = true;
    const all: SearchDocumentEntity[] = [];

    while (hasMore) {
      const result = await this.catalogService.findAllProducts({ status: 'ACTIVE', limit: batchSize, offset });
      const products = Array.isArray(result) ? result : result.items;
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
        currency: p.currency,
        categoryId: p.categoryId,
        sellerId: p.sellerId,
        status: p.status,
        occurredAt: p.updatedAt,
      }));
      all.push(...docs);
      offset += products.length;
      if (products.length < batchSize) hasMore = false;
    }

    await this.repo.reindex(
      all.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        currency: p.currency,
        categoryId: p.categoryId,
        sellerId: p.sellerId,
        status: p.status,
        updatedAt: p.occurredAt,
      })),
    );
  }

  async indexCreated(payload: ProductCreatedPayload, occurredAt: Date): Promise<void> {
    await this.repo.upsert({
      productId: payload.productId,
      title: payload.title,
      description: payload.description,
      price: payload.price,
      currency: payload.currency,
      categoryId: payload.categoryId,
      sellerId: payload.sellerId,
      status: payload.status as 'ACTIVE' | 'ARCHIVED',
      occurredAt,
    });
  }

  async indexUpdated(payload: ProductUpdatedPayload, occurredAt: Date): Promise<void> {
    const existing = await this.repo.findByProductId(payload.productId);
    if (existing && occurredAt <= existing.occurredAt) return;
    await this.repo.upsert({
      productId: payload.productId,
      title: payload.title,
      description: payload.description,
      price: payload.price,
      currency: payload.currency,
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
