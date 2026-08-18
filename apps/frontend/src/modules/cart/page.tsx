'use client';

import { useAppDispatch, useAppSelector, useAsync } from '@/shared/hooks';
import { setCart, removeItem, clearCart as clearCartAction } from '@/store/cartSlice';
import { getCart, upsertItem as upsertCartItem, removeItem as removeCartItem, clearCart } from '@/modules/cart/api';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { toast } from '@/shared/ui/toast';
import type { CartItem } from '@marketplace/contracts/api/cart/cart';
import Link from 'next/link';
import { useState } from 'react';

export function CartPage() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.cart.items);
  const [updating, setUpdating] = useState<string | null>(null);

  const { loading } = useAsync(getCart, []);

  const handleQtyChange = async (item: CartItem, qty: number) => {
    setUpdating(item.productId);
    try {
      const cart = await upsertCartItem(item.productId, { qty });
      dispatch(setCart(cart.items));
    } catch {
      // error handled by interceptor
    } finally {
      setUpdating(null);
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      await removeCartItem(productId);
      dispatch(removeItem(productId));
      toast.success('Item removed from cart');
    } catch {
      // error handled by interceptor
    }
  };

  const handleClear = async () => {
    try {
      await clearCart();
      dispatch(clearCartAction());
      toast.success('Cart cleared');
    } catch {
      // error handled by interceptor
    }
  };

  const total = items.reduce((sum, item) => sum + item.snapshot.price * item.qty, 0);

  if (loading) {
    return <div className="mx-auto max-w-4xl px-6 py-12">Loading cart...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
        {items.length > 0 && (
          <Button variant="destructive" onClick={handleClear}>Clear cart</Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">Your cart is empty.</p>
           <Link href="/products"><Button className="mt-4">Browse products</Button></Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {items.map((item) => (
            <div key={item.productId} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{item.snapshot.title}</h3>
                  <p className="text-sm text-muted-foreground">Price: ${item.snapshot.price}</p>
                  {item.priceChanged && (
                    <p className="text-sm text-orange-600">Price has changed since added</p>
                  )}
                  {item.unavailable && (
                    <p className="text-sm text-destructive">This item is currently unavailable</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`qty-${item.productId}`}>Qty</Label>
                    <Input
                      id={`qty-${item.productId}`}
                      type="number"
                      min={1}
                      max={99}
                      className="w-16"
                      value={item.qty}
                      disabled={updating === item.productId}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (val >= 1 && val <= 99) {
                          handleQtyChange(item, val);
                        }
                      }}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemove(item.productId)}
                    disabled={updating === item.productId}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-lg font-bold">${total}</span>
          </div>
          <div className="flex justify-end">
             <Link href="/orders"><Button size="lg">Proceed to checkout</Button></Link>
          </div>
        </div>
      )}
    </div>
  );
}
