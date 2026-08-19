export interface SearchDocumentEntity {
  id: string;
  productId: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  categoryId: string;
  sellerId: string;
  categoryTitle?: string;
  sellerEmail?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  occurredAt: Date;
}

export interface SearchRepository {
  upsert(data: {
    productId: string;
    title: string;
    description?: string;
    price: number;
    currency: string;
    categoryId: string;
    sellerId: string;
    status: 'ACTIVE' | 'ARCHIVED';
    occurredAt: Date;
  }): Promise<void>;
  remove(productId: string): Promise<void>;
  search(filters: {
    q?: string;
    categoryId?: string;
    priceMin?: number;
    priceMax?: number;
    sellerId?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: SearchDocumentEntity[]; total: number; limit: number; offset: number }>;
  reindex(products: Array<{
    id: string;
    title: string;
    description: string | null;
    price: number;
    currency: string;
    categoryId: string;
    sellerId: string;
    status: 'ACTIVE' | 'ARCHIVED';
    updatedAt: Date;
  }>): Promise<void>;
}

export const SEARCH_REPOSITORY = Symbol('SEARCH_REPOSITORY');
