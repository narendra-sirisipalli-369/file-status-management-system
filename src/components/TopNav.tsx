import Image from 'next/image';
import ISTClock from './ISTClock';

interface TopNavProps {
  showCenterTitle?: boolean;
  department?: string | null;
}

export default function TopNav({ showCenterTitle = false, department }: TopNavProps) {
  return (
    <nav className="topnav" role="navigation" aria-label="Global Navigation">
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
            FILE STATUS INFORMATION SYSTEM - INS DEGA
          </div>
        )}
      </div>

      {/* RIGHT — ENC logo + clock + sign out */}
      <div className="topnav-right">
        <ISTClock />
        <Image
          src="/logo/eastern-command.png"
          alt="Eastern Naval Command Badge"
          width={64}
          height={64}
          className="topnav-logo"
          priority
        />
        <a
          href="/api/auth/logout"
          className="topnav-signout"
          id="global-signout"
          aria-label="Sign Out"
        >
          Sign Out
        </a>
      </div>
    </nav>
  );
}
