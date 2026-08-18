import type { Metadata } from 'next';
import { Providers } from './providers';
import { Toaster } from '@/shared/ui/toast';
import { Navigation } from '@/shared/ui/navigation';
import { RouteAccessGuard } from '@/shared/ui/route-access-guard';
import './globals.css';

export const metadata: Metadata = {
  title: 'Marketplace',
  description: 'A modern marketplace',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navigation />
          <RouteAccessGuard>{children}</RouteAccessGuard>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
