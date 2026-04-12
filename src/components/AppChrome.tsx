'use client';

import { usePathname } from 'next/navigation';
import TopNav from '@/components/TopNav';

function shouldHideGlobalNav(pathname: string): boolean {
  if (pathname.startsWith('/kiosk/track/')) return true;
  if (pathname.startsWith('/login')) return true;
  if (pathname.startsWith('/admin')) return true;
  if (pathname.startsWith('/api')) return true;
  return false;
}

function shouldShowHomeTitle(pathname: string): boolean {
  return pathname === '/home' || pathname === '/kiosk';
}

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = shouldHideGlobalNav(pathname);

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div className="page-wrapper">
      <TopNav showCenterTitle={shouldShowHomeTitle(pathname)} />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}