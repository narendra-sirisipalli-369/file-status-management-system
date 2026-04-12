import Image from 'next/image';
import ISTClock from './ISTClock';
import { Power } from 'lucide-react';

interface TopNavProps {
  showCenterTitle?: boolean;
  centerTitle?: string;
  department?: string | null;
  showClock?: boolean;
  showSessionMenu?: boolean;
  variant?: 'default' | 'login';
}

export default function TopNav({
  showCenterTitle = false,
  centerTitle = 'FILE STATUS INFORMATION SYSTEM - INS DEGA',
  department,
  showClock = true,
  showSessionMenu = true,
  variant = 'default',
}: TopNavProps) {
  return (
    <nav className={`topnav${variant === 'login' ? ' topnav--login' : ''}`} role="navigation" aria-label="Global Navigation">
      {/* LEFT — INS DEGA logo + org name */}
      <div className="topnav-left">
        <Image
          src="/logo/ins-dega.png"
          alt="INS Dega Crest"
          width={64}
          height={64}
          className="topnav-logo"
          priority
        />
        <div>
          <div className="topnav-org-name">
            INS DEGA
            <span className="topnav-org-sub" style={{ fontSize: '0.65rem' }}>Logistics Department</span>
          </div>
          {department && (
            <div style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.65)',
              marginTop: 2,
            }}>
              {department}
            </div>
          )}
        </div>
      </div>

      {/* CENTER — Screen title (shown only on Home page) */}
      <div className="topnav-center">
        {showCenterTitle && (
          <div className="topnav-center-text" style={{ fontSize: '1.1rem', letterSpacing: '0.12em' }}>
            {centerTitle}
          </div>
        )}
      </div>

      {/* RIGHT — ENC logo + clock + session menu */}
      <div className="topnav-right">
        {showClock && <ISTClock />}
        <Image
          src="/logo/eastern-command.png"
          alt="Eastern Naval Command Badge"
          width={64}
          height={64}
          className="topnav-logo"
          priority
        />
        {showSessionMenu && (
          <details className="topnav-menu">
            <summary className="topnav-menu-button" aria-label="Session menu">
              <Power size={18} aria-hidden="true" />
            </summary>
            <div className="topnav-menu-panel" role="menu" aria-label="Session">
              <a href="/api/auth/logout" className="topnav-menu-item" role="menuitem">
                Logout
              </a>
            </div>
          </details>
        )}
      </div>
    </nav>
  );
}
