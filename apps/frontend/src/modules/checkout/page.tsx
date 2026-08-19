'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCart, clearCart } from '@/modules/cart/api';
import { createOrder } from '@/modules/orders/api';
import { useAppDispatch, useAsync } from '@/shared/hooks';
import { setCart, clearCart as clearCartAction } from '@/store/cartSlice';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/toast';

export function CheckoutPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [paying, setPaying] = useState(false);
  const { data: cart, loading } = useAsync(getCart, []);

  useEffect(() => {
    if (cart) dispatch(setCart(cart.items));
  }, [cart, dispatch]);

  const unavailableItems = cart?.items.filter((item) => item.unavailable) ?? [];
  const total = cart?.items.reduce((sum, item) => sum + (item.currentPrice ?? item.snapshot.price) * item.qty, 0) ?? 0;

  const handlePay = async () => {
    if (!cart || cart.items.length === 0 || unavailableItems.length > 0) return;

    setPaying(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await createOrder({
        items: cart.items.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          price: item.currentPrice ?? item.snapshot.price,
        })),
      });
      await clearCart();
      dispatch(clearCartAction());
      toast.success('Payment successful');
      router.push('/orders');
    } catch {
      // error handled by the API interceptor
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-2xl px-6 py-12">Loading checkout...</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-center">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <p className="mt-4 text-muted-foreground">Your cart is empty.</p>
        <Button className="mt-6" onClick={() => router.push('/search')}>Browse products</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold">Checkout</h1>


      <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
        <div className="border-b pb-4 text-center">
          <h2 className="mt-2 text-xl font-semibold">Receipt</h2>
        </div>
        <div className="divide-y">
          {cart.items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{item.snapshot.title}</p>
                <p className="text-sm text-muted-foreground">{item.qty} × ${item.currentPrice ?? item.snapshot.price}</p>
                {item.priceChanged && item.currentPrice && (
                  <p className="text-xs text-orange-600">Previous price: ${item.snapshot.price}</p>
                )}
              </div>
              <p className="font-medium">${(item.currentPrice ?? item.snapshot.price) * item.qty}</p>
            </div>
          ))}
        </div>
        {unavailableItems.length > 0 && (
          <p className="mt-2 text-sm text-destructive">Remove unavailable products before paying.</p>
        )}
        <div className="mt-2 flex items-center justify-between border-t pt-4 text-lg font-bold">
          <span>Total</span>
          <span>${total}</span>
        </div>
        <Button className="mt-6 w-full" size="lg" onClick={handlePay} disabled={paying || unavailableItems.length > 0}>
          {paying ? 'Processing payment...' : `Pay $${total}`}
        </Button>
      </div>
    </div>
  );
}
