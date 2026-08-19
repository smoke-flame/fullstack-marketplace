'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getOrders } from '@/modules/orders/api';
import type { PaginatedOrdersResponse } from '@marketplace/contracts/api/orders/orders';
import { useAsync } from '@/shared/hooks';

export function OrdersPage() {
  const [ordersData, setOrdersData] = useState<PaginatedOrdersResponse | null>(null);
  const [page, setPage] = useState(0);

  const limit = 20;

  const { data, loading } = useAsync(() => getOrders(undefined, limit, page * limit), [page]);

  useEffect(() => {
    if (data) setOrdersData(data);
  }, [data]);

  const totalPages = ordersData ? Math.max(1, Math.ceil(ordersData.total / limit)) : 1;

  if (loading) {
    return <div className="mx-auto max-w-4xl px-6 py-12">Loading orders...</div>;
  }

  const orders = ordersData?.items ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Orders</h1>

      <div className="mt-8 space-y-4">
        {orders.length === 0 ? (
          <p className="text-muted-foreground">No orders yet.</p>
        ) : (
          <>
            {orders.map((order) => (
              <Link data-test-id={`order-link-${order.id}`} key={order.id} href={`/orders/${order.id}`} className="block">
                <div className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
                      <p className="font-semibold">Total: ${order.totalAmount}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'RESERVED' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                          order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-red-100 text-red-800'
                      }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                  className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1 || loading}
                  className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
