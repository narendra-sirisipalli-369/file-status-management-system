'use client';

import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin',             icon: '', label: 'Overview'    },
  { href: '/admin/dashboard',   icon: '', label: 'Dashboard'   },
  { href: '/admin/file-entry',  icon: '', label: 'File Entry'  },
  { href: '/admin/reports',     icon: '', label: 'Reports'     },
  { href: '/admin/flow-charts', icon: '', label: 'Flow Charts' },
  { href: '/admin/users',       icon: '', label: 'Users'       },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav style={{ padding: '1rem 0.75rem', flex: 1 }}>
      <div style={{
        fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
        marginBottom: '0.5rem', paddingLeft: '0.5rem',
      }}>
        Navigation
      </div>

      {NAV_ITEMS.map(item => {
        // Exact match for dashboard, prefix match for others
        const isActive = item.href === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(item.href);

        return (
          <a
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 0.75rem',
              borderRadius: 6,
              marginBottom: 2,
              fontSize: '0.8rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(88,166,255,0.08)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--blue-accent)' : '2px solid transparent',
              transition: 'all 0.15s',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
