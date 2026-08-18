'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { UserRole } from '@marketplace/contracts/models/user';
import { clearTokens } from '@/modules/auth/auth';
import { logout as logoutAction } from '@/modules/auth/userSlice';
import { useAppDispatch, useAppSelector } from '@/shared/hooks';
import { Button } from './button';

const publicLinks = [
  { href: '/search', label: 'Search' },
];

const accountLinks = [
  { href: '/cart', label: 'Cart' },
  { href: '/orders', label: 'Orders' },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);
  const isSeller = user?.roles.includes(UserRole.SELLER) ?? false;
  const [menuOpen, setMenuOpen] = useState(false);

  const links = user
    ? [{ href: '/', label: 'Home' }, { href: '/search', label: 'Search' }, ...accountLinks, ...(isSeller ? [{ href: '/inventory', label: 'Inventory' }] : [])]
    : publicLinks;

  const handleLogout = () => {
    clearTokens();
    dispatch(logoutAction());
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-3">
        <Link href={user ? '/' : '/search'} className="mr-auto text-xl font-bold">Marketplace</Link>
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm sm:hidden"
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          Menu
        </button>
        <nav aria-label="Main navigation" className={`${menuOpen ? 'flex' : 'hidden'} order-3 w-full flex-col gap-1 sm:order-none sm:flex sm:w-auto sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center`}>
          {links.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted ${active ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-sm text-muted-foreground sm:inline">{user.email}</span>
            <Button variant="secondary" size="sm" onClick={handleLogout}>Log out</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login"><Button variant="secondary" size="sm">Sign in</Button></Link>
            <Link href="/register"><Button size="sm">Get started</Button></Link>
          </div>
        )}
      </div>
    </header>
  );
}
