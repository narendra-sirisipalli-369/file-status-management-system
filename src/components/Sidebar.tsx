'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

// Use same access rules as we determined
const NAV_ITEMS_BLOGO = [
  { href: '/admin/dashboard',   label: 'Dashboard'     },
  { href: '/admin/file-entry',  label: 'File Entry'    },
  { href: '/admin/files',       label: 'File Search'   },
  { href: '/admin/reports',     label: 'Reports'       },
  { href: '/admin/flow-charts', label: 'Flow Charts'   },
  { href: '/admin/users',       label: 'User Management'     },
];

const NAV_ITEMS_DLOGO = [
  { href: '/admin/dashboard',   label: 'Dashboard'     },
  { href: '/admin/file-entry',  label: 'File Entry'    },
  { href: '/admin/files',       label: 'File Search'   },
  { href: '/admin/reports',     label: 'Reports'       },
  { href: '/admin/flow-charts', label: 'Flow Charts'   },
];

const NAV_ITEMS_MCPO = NAV_ITEMS_DLOGO;

const NAV_ITEMS_INWARD = [
  { href: '/admin/dashboard',   label: 'Dashboard'     },
  { href: '/admin/file-entry',  label: 'File Entry'    },
  { href: '/admin/files',       label: 'File Search'   },
  { href: '/admin/reports',     label: 'Reports'       },
  { href: '/admin/flow-charts', label: 'Flow Charts'   },
];

const NAV_ITEMS_STORE_OFFICE = [
  { href: '/admin/dashboard',   label: 'Dashboard'     },
  { href: '/admin/file-entry',  label: 'File Entry'    },
  { href: '/admin/files',       label: 'File Search'   },
  { href: '/admin/reports',     label: 'Reports'       },
];

const NAV_ITEMS_IFA = [
  { href: '/admin/dashboard',   label: 'Dashboard'     },
  { href: '/admin/files',       label: 'File Search'   },
  { href: '/admin/reports',     label: 'Reports'       },
];

const NAV_ITEMS_CO_SIR = [
  { href: '/admin/dashboard',   label: 'Dashboard'     },
  { href: '/admin/files',       label: 'File Search'   },
];

// Mailman doesn't use the sidebar (redirected straight to scan), but fallback just in case
const NAV_ITEMS_MAILMAN = [
  { href: '/admin/scan', label: 'QR Scanner' },
];

function getNavItems(role: string) {
  switch (role) {
    case 'B_LOGO':           return NAV_ITEMS_BLOGO;
    case 'D_LOGO':           return NAV_ITEMS_DLOGO;
    case 'MCPO':             return NAV_ITEMS_MCPO;
    case 'INWARD':           return NAV_ITEMS_INWARD;
    case 'STORE_OFFICE':     return NAV_ITEMS_STORE_OFFICE;
    case 'IFA':              return NAV_ITEMS_IFA;
    case 'CO_SIR':           return NAV_ITEMS_CO_SIR;
    case 'MAILMAN_INTERNAL':
    case 'MAILMAN_EXTERNAL':
    case 'MAILMAN':          return NAV_ITEMS_MAILMAN;
    default:                 return NAV_ITEMS_INWARD;
  }
}

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const items = getNavItems(role);

  // Do not render sidebar for mailman as they only use QR scanner
  if (role.startsWith('MAILMAN')) {
    return null;
  }

  return (
    <aside style={{
      width: '260px',
      background: 'rgba(0,0,128,0.03)',
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--space-md)',
      minHeight: 'calc(100vh - 84px)',
      flexShrink: 0,
      borderRight: '1px solid var(--border)'
    }}
    aria-label="Sidebar Navigation"
    >
      <div style={{
        padding: 'var(--space-sm) var(--space-md)',
        fontFamily: 'Arial, sans-serif',
        fontSize: '0.62rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 'var(--letter-spacing-wide)',
        color: 'var(--text-muted)',
        marginBottom: 'var(--space-sm)'
      }}>
        Command Center
      </div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.map(item => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                position: 'relative',
                padding: '0.75rem var(--space-md)',
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
                gap: 'var(--space-md)',
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
                  borderRadius: '0 4px 4px 0'
                }} />
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
