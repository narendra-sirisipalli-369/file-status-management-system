'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  FilePlus2,
  Search,
  Workflow,
  Database,
  Users,
  FileBarChart,
  ScanLine,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

// KIOSK is redirected away from /admin entirely by middleware, so only
// ADMIN and USER ever reach this component. USER gets the restricted subset
// (also enforced server-side in middleware.ts via ADMIN_ONLY_ROUTES).
const ADMIN_NAV_ITEMS = [
  { href: '/admin/dashboard',     label: 'Dashboard',           icon: LayoutDashboard },
  { href: '/admin/file-entry',    label: 'File Entry',          icon: FilePlus2 },
  { href: '/admin/files',         label: 'File Search',         icon: Search },
  { href: '/admin/stage-manager', label: 'Procurement Process', icon: Workflow },
  { href: '/admin/master-data',   label: 'Master Data',         icon: Database },
  { href: '/admin/users',         label: 'Admin Management',    icon: Users },
  { href: '/admin/reports',       label: 'Reports',             icon: FileBarChart },
  { href: '/admin/automation-log', label: 'Automation Log',     icon: ScanLine },
];

const USER_NAV_ITEMS = [
  { href: '/admin/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/admin/file-entry', label: 'File Entry',  icon: FilePlus2 },
  { href: '/admin/files',      label: 'File Search', icon: Search },
];

const STORAGE_KEY = 'fsms.sidebar.collapsed';

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  // Read the persisted preference once on mount (avoids a flash of the
  // wrong state before hydration, without needing this in localStorage-less
  // SSR markup).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === '1') setCollapsed(true);
    setReady(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  if (role !== 'ADMIN' && role !== 'USER') {
    return null;
  }

  const navItems = role === 'ADMIN' ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;
  const width = collapsed ? '64px' : 'clamp(220px, 193px + 3.47vw, 260px)';

  return (
    <aside style={{
      width,
      background: 'rgba(0,0,128,0.03)',
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--space-md) 0.5rem',
      minHeight: 'calc(100vh - var(--topnav-h))',
      flexShrink: 0,
      borderRight: '1px solid var(--border)',
      transition: ready ? 'width 0.2s ease' : 'none',
      overflow: 'hidden',
    }}
    aria-label="Sidebar Navigation"
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-end',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '0.4rem',
          marginBottom: 'var(--space-sm)',
          minHeight: 'auto',
        }}
      >
        {collapsed ? <ChevronsRight size={18} aria-hidden="true" /> : <ChevronsLeft size={18} aria-hidden="true" />}
      </button>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              style={{
                position: 'relative',
                padding: collapsed ? '0.55rem' : '0.45rem var(--space-md)',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                color: isActive ? 'var(--navy)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-white)' : 'transparent',
                boxShadow: isActive ? 'var(--elevate-1)' : 'none',
                fontFamily: 'Arial, sans-serif',
                fontSize: '0.8rem',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: 'var(--letter-spacing-tech)',
                transition: 'var(--transition)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: 'var(--space-md)',
                whiteSpace: 'nowrap',
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '20%',
                  bottom: '20%',
                  width: '3px',
                  background: 'var(--gold)',
                  borderRadius: 0
                }} />
              )}
              <Icon size={17} aria-hidden="true" style={{ flexShrink: 0 }} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
