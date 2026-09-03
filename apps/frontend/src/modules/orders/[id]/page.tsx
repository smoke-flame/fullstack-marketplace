'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/toast';
import { getOrderById, cancelOrder } from '@/modules/orders/api';
import type { OrderResponse } from '@marketplace/contracts/api/orders/orders';
import { useAsync } from '@/shared/hooks';
import { getProductById } from '@/modules/catalog/api';
import { useAppSelector } from '@/shared/hooks';
import type { ProductResponse } from '@marketplace/contracts/api/catalog/products';

export function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [productTitles, setProductTitles] = useState<Map<string, string>>(new Map());
  const currentUserId = useAppSelector((s) => s.user.user?.id ?? null);

  const { loading } = useAsync(
    () => getOrderById(id),
    [id],
  );

  useEffect(() => {
    if (order) return;
    getOrderById(id).then(setOrder).catch(() => { });
  }, [id, order]);

  useEffect(() => {
    if (!order) return;
    const productIds = Array.from(new Set(order.items.map((i) => i.productId)));
    if (productIds.length === 0) return;
    let cancelled = false;
    Promise.all(
      productIds.map(async (productId): Promise<[string, string | null]> => {
        try {
          const product: ProductResponse = await getProductById(productId);
          return [productId, product.title];
        } catch {
          return [productId, null];
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      const map = new Map<string, string>();
      for (const [pid, title] of entries) {
        if (title) map.set(pid, title);
      }
      setProductTitles(map);
    });
    return () => { cancelled = true; };
  }, [order]);

  // Poll order status every 2s until terminal (COMPLETED / CANCELLED / FAILED / PAID)
  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    const orderId = id;
    const isTerminal = (status?: string) => {
      if (!status) return false;
      return ['COMPLETED', 'CANCELLED', 'FAILED', 'PAID'].includes(status);
    };

    if (!order) return undefined;
    if (isTerminal(order.status)) return undefined;

    const POLL_MS = 2000;
    const start = () => {
      if (pollRef.current) return;
      pollRef.current = window.setInterval(async () => {
        try {
          const updated = await getOrderById(orderId);
          if (updated) setOrder(updated);
          if (isTerminal(updated?.status)) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          }
        } catch {
          // ignore transient errors; will retry until terminal
        }
      }, POLL_MS) as unknown as number;
    };

    start();

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [id, order]);

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const updated = await cancelOrder(order.id);
      setOrder(updated);
      toast.success('Order cancelled');
    } catch {
      // error handled by interceptor
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl px-6 py-12">Loading order...</div>;
  }

  if (!order) {
    return <div className="mx-auto max-w-4xl px-6 py-12">Order not found.</div>;
  }

  const canCancel = order.status === 'PENDING' || order.status === 'RESERVED';

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/orders" className="text-sm text-muted-foreground hover:underline">&larr; Back to orders</Link>
      <h1 className="mt-4 text-3xl font-bold">Order</h1>
      <p className="text-sm text-muted-foreground">Created: {new Date(order.createdAt).toLocaleString()}</p>

      <div className="mt-8 grid gap-6">
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Details</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{order.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-medium">${order.totalAmount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Buyer</p>
              <p className="font-medium">{currentUserId === order.buyerId ? 'You' : 'Customer'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p className="font-medium">{new Date(order.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Items</h2>
          <ul className="mt-4 space-y-2">
            {order.items.map((item, idx) => (
              <li key={idx} className="flex items-center justify-between rounded border p-3">
                <span className="font-medium">{productTitles.get(item.productId) ?? 'Product'}</span>
                <span className="text-sm">Qty: {item.qty}</span>
                <span className="text-sm font-medium">${item.price}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Timeline</h2>
          <ul className="mt-4 space-y-3">
            {order.timeline.map((entry, idx) => (
              <li key={idx} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span className="font-medium">{entry.status}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(entry.occurredAt).toLocaleString()}
                  {entry.reason ? ` — ${entry.reason}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {canCancel && (
          <div className="flex justify-end">
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
