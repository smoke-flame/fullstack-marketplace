'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { toast } from '@/shared/ui/toast';
import { getProductById } from '@/modules/catalog/api';
import { upsertItem } from '@/modules/cart/api';
import { useAppDispatch } from '@/shared/hooks';
import { upsertItem as upsertCartItem } from '@/store/cartSlice';
import { useAsync } from '@/shared/hooks';

export function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const dispatch = useAppDispatch();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  const { data: product, loading } = useAsync(
    () => getProductById(id),
    [id],
  );

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      const cart = await upsertItem(product.id, { qty });
      dispatch(upsertCartItem(cart.items.find((i) => i.productId === product.id)!));
      toast.success('Added to cart');
    } catch {
      // error handled by interceptor
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl px-6 py-12">Loading product...</div>;
  }

  if (!product) {
    return <div className="mx-auto max-w-4xl px-6 py-12">Product not found.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/products" className="text-sm text-muted-foreground hover:underline">&larr; Back to products</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold">{product.title}</h1>
          <p className="mt-4 text-4xl font-bold">${product.price}</p>
          <span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${
            product.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {product.status}
          </span>
          <p className="mt-6 text-muted-foreground">{product.description ?? 'No description provided.'}</p>
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <p>Seller: {product.sellerId}</p>
            <p>Category: {product.categoryId}</p>
            <p>Updated: {new Date(product.updatedAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="rounded-lg border p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={99}
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <Button className="w-full" onClick={handleAddToCart} disabled={adding}>
              {adding ? 'Adding...' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
