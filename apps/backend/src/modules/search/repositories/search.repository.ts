export interface SearchDocumentEntity {
  id: string;
  productId: string;
  title: string;
  description: string | null;
  price: number;
  categoryId: string;
  sellerId: string;
  status: 'ACTIVE' | 'ARCHIVED';
  occurredAt: Date;
}

export interface SearchRepository {
  upsert(data: {
    productId: string;
    title: string;
    description?: string;
    price: number;
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
    cursor?: string;
    limit: number;
  }): Promise<{ items: SearchDocumentEntity[]; nextCursor?: string }>;
  reindex(products: Array<{
    id: string;
    title: string;
    description: string | null;
    price: number;
    categoryId: string;
    sellerId: string;
    status: 'ACTIVE' | 'ARCHIVED';
    updatedAt: Date;
  }>): Promise<void>;
}

export const SEARCH_REPOSITORY = Symbol('SEARCH_REPOSITORY');
