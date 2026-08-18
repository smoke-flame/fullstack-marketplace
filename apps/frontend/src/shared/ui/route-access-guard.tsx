'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isAuthenticated } from '@/modules/auth/auth';
import { useAppSelector } from '@/shared/hooks';

const guestRoutes = ['/search', '/login', '/register', '/products'];

export function RouteAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const initialized = useAppSelector((state) => state.user.initialized);
  const user = useAppSelector((state) => state.user.user);

  useEffect(() => {
    if (!initialized) return;
    if (!user && !isAuthenticated() && !guestRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
      router.replace('/login');
    }
  }, [initialized, pathname, router, user]);

  if (!initialized) return null;
  return children;
}
