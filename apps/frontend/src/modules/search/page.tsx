'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search as SearchIcon, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { search } from '@/modules/search/api';
import type { SearchResponse } from '@marketplace/contracts/api/search/search';
import type { Sort } from '@marketplace/contracts/api/search/search';
import { getAllCategories } from '@/modules/catalog/api';
import type { CategoryResponse } from '@marketplace/contracts/api/catalog/categories';
import { useAsync, useAppSelector } from '@/shared/hooks';
import { useAppDispatch } from '@/shared/hooks';
import { upsertItem } from '@/modules/cart/api';
import { upsertItem as upsertCartItem } from '@/store/cartSlice';
import { toast } from '@/shared/ui/toast';
import { UserRole } from '@marketplace/contracts/models/user';
import { CreateProductModal } from './components/create-product-modal';
import { CreateCategoryModal } from './components/create-category-modal';

type CategoryNode = CategoryResponse & { children?: CategoryNode[] };

export function SearchPage() {
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sort, setSort] = useState<Sort>('relevance');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [searchedQuery, setSearchedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [categoriesVersion, setCategoriesVersion] = useState(0);
  const [resultsVersion, setResultsVersion] = useState(0);
  const { data: categoryData } = useAsync(getAllCategories, [categoriesVersion]);
  const categories = categoryData ?? [];
  const user = useAppSelector((state) => state.user.user);
  const isSeller = user?.roles.includes(UserRole.SELLER) ?? false;
  const dispatch = useAppDispatch();

  const limit = 20;
  const totalPages = results ? Math.max(1, Math.ceil(results.total / limit)) : 1;

  useEffect(() => {
    let active = true;
    search({ sort, limit, offset: 0 })
      .then((data) => {
        if (active) {
          setResults(data);
          setInitialLoading(false);
        }
      })
      .catch(() => { })
      .finally(() => {
        if (active) setInitialLoading(false);
      });
    return () => { active = false; };
  }, [sort, resultsVersion]);

  const handleAddToCart = async (event: React.MouseEvent, productId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setAddingProductId(productId);
    try {
      const cart = await upsertItem(productId, { qty: 1 });
      const item = cart.items.find((entry) => entry.productId === productId);
      if (item) dispatch(upsertCartItem(item));
      toast.success('Added to cart');
    } catch {
      // handled by the API interceptor
    } finally {
      setAddingProductId(null);
    }
  };

  const handleSubmit = async (event?: React.FormEvent, nextPage?: number) => {
    event?.preventDefault();
    const submittedQuery = q.trim();
    const nextOffset = nextPage !== undefined ? nextPage * limit : 0;
    setLoading(true);
    try {
      const data = await search({
        q: submittedQuery || undefined,
        categoryId: categoryId || undefined,
        priceMin: priceMin ? Number(priceMin) : undefined,
        priceMax: priceMax ? Number(priceMax) : undefined,
        sort,
        limit,
        offset: nextOffset,
      });
      setResults(data);
      setSearchedQuery(submittedQuery);
      setSearched(true);
      setPage(nextPage !== undefined ? nextPage : 0);
    } catch {
      // handled by the API interceptor
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setCategoryId('');
    setPriceMin('');
    setPriceMax('');
  };

  const goToPage = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= totalPages) return;
    handleSubmit(undefined, nextPage);
  };

  const renderPageButtons = () => {
    if (totalPages <= 1) return null;
    const pages: (number | '...')[] = [];
    const addPage = (p: number) => pages.push(p);

    addPage(0);
    if (totalPages > 1) {
      if (page > 2) pages.push('...');
      for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
        addPage(i);
      }
      if (page < totalPages - 3) pages.push('...');
    }
    if (totalPages > 1) addPage(totalPages - 1);

    return (
      <div className="flex items-center justify-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(page - 1)}
          disabled={page === 0 || loading}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-sm text-muted-foreground">...</span>
          ) : (
            <Button
              key={p}
              variant={page === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => goToPage(p)}
              disabled={loading}
              aria-label={`Page ${p + 1}`}
              aria-current={page === p ? 'page' : undefined}
            >
              {p + 1}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(page + 1)}
          disabled={page === totalPages - 1 || loading}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    );
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <section className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Marketplace</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Find something you&apos;ll love</h1>
            <p className="mt-3 text-muted-foreground">Explore products from trusted sellers and discover your next favorite item.</p>
          </div>
          <form onSubmit={(event) => void handleSubmit(event)} className="mt-7 flex max-w-4xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input data-test-id="search-input" className="h-12 rounded-xl border-2 bg-background pl-12 text-base" placeholder="What are you looking for?" value={q} onChange={(event) => setQ(event.target.value)} />
            </div>
            <Button data-test-id="search-submit" type="submit" size="lg" className="h-12 rounded-xl px-8" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className={`${showFilters ? 'block' : 'hidden'} h-fit rounded-xl border bg-background lg:block`}>
            <div className="border-b p-5 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Filters</h3>
                {(categoryId || priceMin || priceMax) && (
                  <button type="button" className="text-xs text-primary hover:underline" onClick={clearFilters}>
                    Clear all
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-6 p-5 pt-4">
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
                <div className="max-h-64 overflow-y-auto rounded-lg border p-2">
                  {categories.length ? (
                    categories.map((category) => (
                      <CategoryTree key={category.id} category={category as CategoryNode} selectedId={categoryId} onSelect={setCategoryId} />
                    ))
                  ) : (
                    <p className="p-2 text-sm text-muted-foreground">No categories yet.</p>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min={0} placeholder="Min" value={priceMin} onChange={(event) => setPriceMin(event.target.value)} />
                  <Input type="number" min={0} placeholder="Max" value={priceMax} onChange={(event) => setPriceMax(event.target.value)} />
                </div>
              </div>
              <Button type="button" className="w-full" onClick={() => void handleSubmit()} disabled={loading}>
                Apply filters
              </Button>
            </div>
          </aside>

          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Browse products</h2>
                {searched && (
                  <p className="text-sm text-muted-foreground">
                    {results?.items.length ?? 0} results
                    {searchedQuery && ` for "${searchedQuery}"`}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {isSeller && (
                  <>
                    <Button data-test-id="sell-item" size="sm" onClick={() => setShowProductModal(true)}>
                      Sell an item
                    </Button>
                    <Button data-test-id="new-category" size="sm" variant="outline" onClick={() => setShowCategoryModal(true)}>
                      New category
                    </Button>
                  </>
                )}
                <Button
                  data-test-id="filters-toggle"
                  size="sm"
                  variant="outline"
                  className="lg:hidden"
                  onClick={() => setShowFilters((open) => !open)}
                >
                  <SlidersHorizontal className="mr-2 size-4" />
                  Filters
                </Button>
              </div>
            </div>
            <section>
              <div className="mb-4 flex justify-end">
                <select
                  aria-label="Sort products"
                  className="h-10 rounded-lg border bg-background px-3 text-sm font-medium"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as Sort)}
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="createdAt_desc">Newest</option>
                </select>
              </div>
              {initialLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-80 animate-pulse rounded-xl border bg-background" />
                  ))}
                </div>
              ) : results && results.items.length > 0 ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {results.items.map((item) => (
                      <Link
                        key={item.productId}
                        href={`/products/${item.productId}`}
                        data-test-id={`product-link-${item.productId}`}
                        className="group flex flex-col overflow-hidden rounded-xl border bg-background transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <span className="text-5xl font-bold text-muted-foreground/30">
                            {item.title.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                          <h3
                            data-test-id={`product-title-${item.productId}`}
                            className="line-clamp-2 min-h-12 font-semibold group-hover:text-primary"
                          >
                            {item.title}
                          </h3>
                          <p className="mt-3 text-2xl font-bold">
                            {item.currency === 'UAH' ? '₴' : item.currency} {item.price}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {item.categoryTitle} · Seller: {item.sellerEmail}
                          </p>
                          <Button
                            data-test-id={`add-to-cart-${item.productId}`}
                            type="button"
                            className="mt-4 w-full"
                            onClick={(event) => void handleAddToCart(event, item.productId)}
                            disabled={addingProductId === item.productId}
                          >
                            {addingProductId === item.productId ? 'Adding...' : 'Add to cart'}
                          </Button>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-6">
                    {renderPageButtons()}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed bg-background px-6 py-16 text-center">
                  <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted">
                    <SearchIcon className="size-5 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 font-semibold">
                    {searched ? 'No products found' : 'No products available'}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    {searched
                      ? searchedQuery
                        ? `There are no products that include "${searchedQuery}".`
                        : 'Try adjusting your filters or search for something else.'
                      : 'There are no products in the marketplace yet.'}
                  </p>
                  {searched && (
                    <Button variant="outline" className="mt-5" onClick={clearFilters}>
                      <X className="mr-2 size-4" />
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
      {showProductModal && (
        <CreateProductModal categories={categories} onClose={() => setShowProductModal(false)} onCreated={() => { setResultsVersion((v) => v + 1); setCategoriesVersion((v) => v + 1); }} />
      )}
      {showCategoryModal && (
        <CreateCategoryModal categories={categories} onClose={() => setShowCategoryModal(false)} onCreated={() => { setCategoriesVersion((version) => version + 1); setResultsVersion((v) => v + 1); }} />
      )}
    </main>
  );
}

function CategoryTree({ category, selectedId, onSelect, depth = 0 }: { category: CategoryNode; selectedId: string; onSelect: (id: string) => void; depth?: number }) {
  return (
    <div>
      <label
        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <input type="radio" name="search-category" checked={selectedId === category.id} onChange={() => onSelect(category.id)} />
        {category.title}
      </label>
      {category.children?.map((child) => (
        <CategoryTree key={child.id} category={child} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}
