import Image from 'next/image';
import ISTClock from './ISTClock';
import { Power } from 'lucide-react';

interface TopNavProps {
  showCenterTitle?: boolean;
  heading?: string;
  title?: string;
  tagline?: string;
  showClock?: boolean;
  showSessionMenu?: boolean;
  logoutHref?: string;
  variant?: 'default' | 'login';
}

export default function TopNav({
  showCenterTitle = false,
  heading = 'INS DEGA',
  title = 'File Status Management System',
  tagline = 'YOUR ONE STOP SOLUTION',
  showClock = true,
  showSessionMenu = true,
  logoutHref = '/api/auth/logout?portal=staff',
  variant = 'default',
}: TopNavProps) {
  return (
    <nav className={`topnav${variant === 'login' ? ' topnav--login' : ''}`} role="navigation" aria-label="Global Navigation">
      {/* LEFT — Eastern Naval Command logo */}
      <div className="topnav-left">
        <Image
          src="/logo/eastern-command.png"
          alt="Eastern Naval Command Badge"
          width={737}
          height={750}
          className="topnav-logo"
          priority
        />
      </div>

      {/* CENTER — Screen title (shown only on Home page) */}
      <div className="topnav-center">
        {showCenterTitle && (
          <div className="topnav-center-text">
            <div className="topnav-center-heading">{heading}</div>
            <div className="topnav-center-title">{title}</div>
            <div className="topnav-center-tagline">{tagline}</div>
          </div>
        )}
      </div>

      {/* RIGHT — INS DEGA logo (larger) + clock + session menu */}
      <div className="topnav-right">
        {showClock && <ISTClock />}
        {showSessionMenu && (
          <details className="topnav-menu">
            <summary className="topnav-menu-button" aria-label="Session menu">
              <Power size={18} aria-hidden="true" />
            </summary>
            <div className="topnav-menu-panel" role="menu" aria-label="Session">
              <a href={logoutHref} className="topnav-menu-item" role="menuitem">
                Logout
              </a>
            </div>
          </details>
        )}
        <Image
          src="/logo/ins-dega-transparent.png"
          alt="INS Dega Emblem"
          width={701}
          height={864}
          className="topnav-logo topnav-logo--large"
          priority
        />
      </div>
    </nav>
  );
}
