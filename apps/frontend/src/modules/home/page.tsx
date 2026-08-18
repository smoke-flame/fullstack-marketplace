'use client';

import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { useAppDispatch, useAppSelector } from '@/shared/hooks';
import { logout as logoutAction } from '@/modules/auth/userSlice';
import { clearTokens } from '@/modules/auth/auth';
import { toast } from '@/shared/ui/toast';

export function HomePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);

  const handleLogout = () => {
    clearTokens();
    dispatch(logoutAction());
    toast.success('Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            Marketplace
          </Link>
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">{user.email}</span>
                <Button variant="secondary" onClick={handleLogout}>Log out</Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="secondary">Sign in</Button>
                </Link>
                <Link href="/register">
                  <Button>Get started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="grid place-items-center px-8 py-24">
          <div className="max-w-2xl space-y-6 text-center">
            <h1 className="text-5xl font-bold tracking-tight">Buy. Sell. Build trust.</h1>
            <p className="text-xl text-muted-foreground">
              The modern marketplace for everyone. Discover deals, list items, and connect with buyers and sellers in a trusted environment.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              {user ? (
                 <Link href="/products">
                   <Button size="lg">Browse listings</Button>
                 </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg">Get started</Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="secondary">Sign in</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/50">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid gap-8 sm:grid-cols-3">
              <div className="space-y-2">
                <h3 className="font-semibold">Secure payments</h3>
                <p className="text-sm text-muted-foreground">Transactions protected with industry-standard encryption and secure checkout.</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Verified sellers</h3>
                <p className="text-sm text-muted-foreground">Every seller is verified so you can buy with confidence and peace of mind.</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Fast delivery</h3>
                <p className="text-sm text-muted-foreground">Get items delivered quickly with real-time tracking and reliable logistics.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
