'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

/**
 * Kiosk Splash Page
 * Touch-optimized landing screen. "TOUCH TO BEGIN" navigates to the search form.
 */

export default function KioskSplashPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000080',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: 'Arial, Helvetica, sans-serif',
    }}>
      {/* Logos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
        <Image src="/logo/eastern-command.png" alt="Eastern Naval Command" width={96} height={96} style={{ objectFit: 'contain', width: 'clamp(64px, 8vw, 96px)', height: 'auto' }} priority />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>INS DEGA</div>
        </div>
        <Image src="/logo/ins-dega.png" alt="INS Dega" width={112} height={112} style={{ objectFit: 'contain', width: 'clamp(76px, 9.5vw, 112px)', height: 'auto' }} priority />
      </div>

      {/* System title */}
      <div style={{
        fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.15em',
        textTransform: 'uppercase', color: '#b8860b', marginBottom: '0.5rem', textAlign: 'center',
      }}>
        File Status Information System
      </div>
      <div style={{
        fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em',
        textTransform: 'uppercase', marginBottom: '3rem', textAlign: 'center',
      }}>
        Logistics Department — Information Kiosk
      </div>

      {/* Touch to begin button */}
      <button
        onClick={() => router.push('/kiosk/login')}
        style={{
          minHeight: 'clamp(56px, 6vw, 80px)',
          padding: '0 3rem',
          border: '3px solid #b8860b',
          borderRadius: 0,
          background: 'transparent',
          color: '#fff',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontWeight: 900,
          fontSize: '1.1rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(184,134,11,0.15)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        TOUCH TO BEGIN
      </button>

      <div style={{
        marginTop: '3rem', fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)',
        letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center',
      }}>
        Restricted Access - Authorised Department Personnel Only
      </div>
    </div>
  );
}
