import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import TopNav from '@/components/TopNav';
import GlobalScanListener from '@/components/GlobalScanListener';
import Sidebar from '@/components/Sidebar';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-for-dev'
);

async function getUserFromCookie() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      role:             payload.role as string,
      username:         payload.username as string,
      loginDepartment:  payload.loginDepartment as string | null,
    };
  } catch {
    return null;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserFromCookie();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      <GlobalScanListener />

      {/* Global Top Navigation */}
      <TopNav
        showCenterTitle={true}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar Navigation */}
        <Sidebar role={user?.role ?? ''} />

        {/* Page Content */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
