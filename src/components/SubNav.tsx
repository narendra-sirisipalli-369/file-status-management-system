'use client';

import { usePathname } from 'next/navigation';

const NAV_ITEMS_BLOGO = [
  { href: '/admin',             label: 'Home'         },
  { href: '/admin/files',       label: 'Files'        },
  { href: '/admin/dashboard',   label: 'Dashboard'    },
  { href: '/admin/file-entry',  label: 'File Entry'   },
  { href: '/admin/flow-charts', label: 'Flow Charts'  },
  { href: '/admin/reports',     label: 'Reports'      },
  { href: '/admin/users',       label: 'Users'        },
];

const NAV_ITEMS_DLOGO = [
  { href: '/admin',             label: 'Home'       },
  { href: '/admin/files',       label: 'Files'      },
  { href: '/admin/dashboard',   label: 'Dashboard'  },
  { href: '/admin/file-entry',  label: 'File Entry' },
  { href: '/admin/flow-charts', label: 'Flow Charts'},
  { href: '/admin/reports',     label: 'Reports'    },
];

// MCPO has same access as D_LOGO
const NAV_ITEMS_MCPO = NAV_ITEMS_DLOGO;

const NAV_ITEMS_INWARD = [
  { href: '/admin',             label: 'Home'       },
  { href: '/admin/files',       label: 'Files'      },
  { href: '/admin/file-entry',  label: 'File Entry' },
  { href: '/admin/reports',     label: 'Reports'    },
];

const NAV_ITEMS_STORE_OFFICE = [
  { href: '/admin',             label: 'Home'       },
  { href: '/admin/files',       label: 'Files'      },
  { href: '/admin/file-entry',  label: 'File Entry' },
  { href: '/admin/reports',     label: 'Reports'    },
];

const NAV_ITEMS_IFA = [
  { href: '/admin',         label: 'Home'    },
  { href: '/admin/files',   label: 'Files'   },
  { href: '/admin/reports', label: 'Reports' },
];

const NAV_ITEMS_CO_SIR = [
  { href: '/admin',       label: 'Home'  },
  { href: '/admin/files', label: 'Files' },
];

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

export default function SubNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = getNavItems(role);

  return (
    <nav className="subnav" role="navigation" aria-label="Section Navigation">
      {items.map(item => {
        const isActive = item.href === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(item.href);
        return (
          <a
            key={item.href}
            href={item.href}
            className={`subnav-link${isActive ? ' active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
