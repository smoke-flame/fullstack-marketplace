'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { search } from '@/modules/search/api';
import type { SearchResponse } from '@marketplace/contracts/api/search/search';
import Link from 'next/link';

export function SearchPage() {
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sort, setSort] = useState<'relevance' | 'price_asc' | 'price_desc' | 'createdAt_desc'>('relevance');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await search({
        q: q || undefined,
        categoryId: categoryId || undefined,
        priceMin: priceMin ? Number(priceMin) : undefined,
        priceMax: priceMax ? Number(priceMax) : undefined,
        sort,
        limit: 20,
      });
      setResults(data);
      setSearched(true);
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold">Search</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-lg border p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="q">Query</Label>
            <Input
              id="q"
              placeholder="Search products..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryId">Category ID</Label>
            <Input
              id="categoryId"
              placeholder="UUID"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceMin">Min Price</Label>
            <Input
              id="priceMin"
              type="number"
              min={0}
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceMax">Max Price</Label>
            <Input
              id="priceMax"
              type="number"
              min={0}
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sort">Sort</Label>
            <select
              id="sort"
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="createdAt_desc">Newest</option>
            </select>
          </div>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </form>

      {searched && (
        <div className="mt-8">
          {results && results.items.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.items.map((item) => (
                <Link key={item.productId} href={`/products/${item.productId}`} className="block">
                  <div className="rounded-lg border p-6 transition-colors hover:bg-muted/50">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-2 text-2xl font-bold">${item.price}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.categoryId}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No results found.</p>
          )}
        </div>
      )}
    </div>
  );
}
