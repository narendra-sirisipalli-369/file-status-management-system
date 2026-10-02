'use client';

import { usePathname } from 'next/navigation';
import TopNav from '@/components/TopNav';
import IdleLogout from '@/components/IdleLogout';

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
  const isKiosk = pathname.startsWith('/kiosk');

  return (
    <div className="page-wrapper">
      {!isLogin && <IdleLogout portal={isKiosk ? 'kiosk' : 'staff'} />}
      <TopNav
        showCenterTitle={shouldShowHomeTitle(pathname) || isLogin}
        showClock={!isLogin}
        showSessionMenu={!isLogin}
        logoutHref={isKiosk ? '/api/auth/logout?portal=kiosk' : undefined}
        variant={isLogin ? 'login' : 'default'}
      />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
