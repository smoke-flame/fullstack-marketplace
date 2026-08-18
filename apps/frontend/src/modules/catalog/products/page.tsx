'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { getAllProducts, getAllCategories } from '@/modules/catalog/api';
import type { ProductResponse } from '@marketplace/contracts/api/catalog/products';
import type { CategoryResponse } from '@marketplace/contracts/api/catalog/categories';
import { useAsync } from '@/shared/hooks';

export function ProductsPage() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const productsResult = useAsync(() => getAllProducts(), []);
  const categoriesResult = useAsync(() => getAllCategories(), []);

  useEffect(() => {
    if (productsResult.data) setProducts(productsResult.data);
  }, [productsResult.data]);

  useEffect(() => {
    if (categoriesResult.data) setCategories(categoriesResult.data);
  }, [categoriesResult.data]);

  const loading = productsResult.loading || categoriesResult.loading;

  const filtered = products.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="mx-auto max-w-6xl px-6 py-12">Loading products...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row">
        <div className="flex-1 space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <Link key={product.id} href={`/products/${product.id}`} className="block">
            <div className="rounded-lg border p-6 transition-colors hover:bg-muted/50">
              <h3 className="font-semibold">{product.title}</h3>
              <p className="mt-2 text-2xl font-bold">${product.price}</p>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {product.description ?? 'No description'}
              </p>
              <span className={`mt-3 inline-block rounded-full px-2 py-1 text-xs font-medium ${
                product.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {product.status}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-muted-foreground">No products found.</p>
      )}
    </div>
  );
}
