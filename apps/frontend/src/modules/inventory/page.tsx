'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toast';
import { getStock, setStock } from '@/modules/inventory/api';
import { getAllProducts } from '@/modules/catalog/api';
import type { StockResponse } from '@marketplace/contracts/api/inventory/inventory';
import type { ProductResponse } from '@marketplace/contracts/api/catalog/products';
import { setStockRequestSchema, type SetStockRequest } from '@marketplace/contracts/api/inventory/inventory';
import { useAsync } from '@/shared/hooks';

export function InventoryPage() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [stocks, setStocks] = useState<Map<string, StockResponse>>(new Map());
  const [editingId, setEditingId] = useState<string | null>(null);

  const productsResult = useAsync(getAllProducts, []);

  useEffect(() => {
    if (!productsResult.data) return;
    setProducts(productsResult.data);
    Promise.all(
      productsResult.data.map(async (p) => ({
        productId: p.id,
        stock: await getStock(p.id),
      }))
    ).then((stockData) => {
      const map = new Map<string, StockResponse>();
      stockData.forEach((s) => map.set(s.productId, s.stock));
      setStocks(map);
    }).catch(() => {});
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
            {products.map((product) => {
              const stock = stocks.get(product.id);
              const isEditing = editingId === product.id;
              return (
                <tr key={product.id} className="border-b last:border-0">
                  <td className="py-4">
                    <div>
                      <p className="font-medium">{product.title}</p>
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
                            className="w-24"
                            {...register('onHand', { valueAsNumber: true })}
                          />
                          {errors.onHand && (
                            <p className="text-xs text-destructive">{errors.onHand.message}</p>
                          )}
                        </div>
                        <Button type="submit" size="sm" disabled={isSubmitting}>
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
    </div>
  );
}
