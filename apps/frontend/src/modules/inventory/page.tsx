'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/button';
import Link from 'next/link';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toast';
import { getStocks, setStock } from '@/modules/inventory/api';
import { getAllProducts } from '@/modules/catalog/api';
import type { StockResponse } from '@marketplace/contracts/api/inventory/inventory';
import type { PaginatedProductsResponse } from '@marketplace/contracts/api/catalog/products';
import { setStockRequestSchema, type SetStockRequest } from '@marketplace/contracts/api/inventory/inventory';
import { useAppSelector, useAsync } from '@/shared/hooks';

export function InventoryPage() {
  const [products, setProducts] = useState<PaginatedProductsResponse | null>(null);
  const [stocks, setStocks] = useState<Map<string, StockResponse>>(new Map());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const userId = useAppSelector((state) => state.user.user?.id);

  const limit = 20;

  const productsResult = useAsync(
    (signal) => userId ? getAllProducts(signal, userId, limit, page * limit) : Promise.resolve({ items: [], total: 0, limit, offset: page * limit }),
    [userId, page],
  );

  useEffect(() => {
    if (!productsResult.data) return;
    setProducts(productsResult.data);
    const productIds = productsResult.data.items.map((p) => p.id);
    if (productIds.length === 0) {
      setStocks(new Map());
      return;
    }
    let cancelled = false;
    getStocks(productIds)
      .then((result) => {
        if (cancelled) return;
        const map = new Map<string, StockResponse>();
        for (const stock of result.stocks) map.set(stock.productId, stock);
        setStocks(map);
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, [productsResult.data]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SetStockRequest>({
    resolver: zodResolver(setStockRequestSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: SetStockRequest) => {
    if (!editingId) return;
    try {
      const stock = await setStock(editingId, data);
      setStocks((prev) => new Map(prev).set(editingId, stock));
      toast.success('Stock updated');
      setEditingId(null);
      reset();
    } catch {
      // error handled by interceptor
    }
  };

  const totalPages = products ? Math.max(1, Math.ceil(products.total / limit)) : 1;

  const loading = productsResult.loading;

  if (loading) {
    return <div className="mx-auto max-w-4xl px-6 py-12">Loading inventory...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Inventory</h1>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-3 font-medium">Product</th>
              <th className="pb-3 font-medium">On Hand</th>
              <th className="pb-3 font-medium">Reserved</th>
              <th className="pb-3 font-medium">Available</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products?.items.map((product) => {
              const stock = stocks.get(product.id);
              const isEditing = editingId === product.id;
              return (
                <tr key={product.id} data-test-id={`inventory-row-${product.id}`} className="border-b last:border-0">
                  <td className="py-4">
                    <div>
                      <Link href={`/products/${product.id}`} className="font-medium hover:text-primary hover:underline">{product.title}</Link>
                      <p className="text-xs text-muted-foreground">{product.id}</p>
                    </div>
                  </td>
                  <td className="py-4">{stock?.onHand ?? '-'}</td>
                  <td className="py-4">{stock?.reserved ?? '-'}</td>
                  <td className="py-4">{stock?.available ?? '-'}</td>
                  <td className="py-4">
                    {isEditing ? (
                      <form onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-2">
                        <div className="space-y-1">
                          <Input
                            type="number"
                            data-test-id="stock-onhand-input"
                            className="w-24"
                            {...register('onHand', { valueAsNumber: true })}
                          />
                          {errors.onHand && (
                            <p className="text-xs text-destructive">{errors.onHand.message}</p>
                          )}
                        </div>
                        <Button data-test-id="save-stock" type="submit" size="sm" disabled={isSubmitting}>
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingId(null); reset(); }}
                        >
                          Cancel
                        </Button>
                      </form>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingId(product.id)}
                      >
                        Set Stock
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1 || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
