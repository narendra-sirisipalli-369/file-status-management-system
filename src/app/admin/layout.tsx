import TopNav from '@/components/TopNav';
import GlobalScanListener from '@/components/GlobalScanListener';
import Sidebar from '@/components/Sidebar';
import IdleLogout from '@/components/IdleLogout';
import { getSessionUser } from '@/lib/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      <GlobalScanListener />
      <IdleLogout portal="staff" />

      {/* Global Top Navigation */}
      <TopNav
        showCenterTitle={true}
      />

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar Navigation */}
        <Sidebar role={user?.role ?? ''} />

        {/* Page Content — flows naturally with the page; the whole page scrolls
            rather than clipping content into an inner scroll region (which,
            combined with the sidebar's min-height, could cut off long pages
            like Master Data before their bottom was reachable). */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
