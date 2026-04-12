'use client';

import { usePathname } from 'next/navigation';
import TopNav from '@/components/TopNav';

function shouldHideGlobalNav(pathname: string): boolean {
  if (pathname.startsWith('/kiosk/track/')) return true;
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

  const isLogin = pathname === '/login' || pathname === '/kiosk/login';

  return (
    <div className="page-wrapper">
      <TopNav
        showCenterTitle={shouldShowHomeTitle(pathname) || isLogin}
        centerTitle={isLogin ? 'Eastern Naval Command - File Status Management System' : undefined}
        showClock={!isLogin}
        showSessionMenu={!isLogin}
        variant={isLogin ? 'login' : 'default'}
      />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
