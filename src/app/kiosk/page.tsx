'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

/**
 * Kiosk Login Page — Screen 1
 * Per FSMS_Report.pdf: End users log in with shared department credentials.
 * Username is selected from a dropdown. On success, routes to /kiosk/home.
 */

type UserEntry = { username: string; role: string; department: string | null };

export default function KioskLoginPage() {
  const router = useRouter();
  const [kioskUsers, setKioskUsers] = useState<UserEntry[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/users/list')
      .then(r => r.json())
      .then((data: UserEntry[]) => {
        if (Array.isArray(data)) {
          const kiosks = data.filter(u => u.role === 'KIOSK_USER');
          setKioskUsers(kiosks);
          if (kiosks.length > 0) setUsername(kiosks[0].username);
        }
      })
      .catch(() => {});
  }, []);

  const selectedUser = kioskUsers.find(u => u.username === username);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const dept = selectedUser?.department ?? 'Logistics';
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, department: dept }),
      });
      if (res.ok) {
        router.push(`/kiosk/home?department=${encodeURIComponent(dept)}`);
        router.refresh();
      } else {
        const d = await res.json();
        setError(d.error ?? 'Authentication failed.');
      }
    } catch {
      setError('Network error. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f4f4f8',
      padding: '2rem 1rem',
    }}>
      {/* Header logos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <Image src="/logo/ins-dega.png" alt="INS Dega" width={72} height={72} style={{ objectFit: 'contain' }} priority />
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '1rem',
            letterSpacing: '0.08em', textTransform: 'uppercase', color: '#000080',
          }}>INS DEGA</div>
          <div style={{ fontSize: '0.7rem', color: '#333', letterSpacing: '0.06em' }}>
            Eastern Naval Command - Indian Navy
          </div>
        </div>
        <Image src="/logo/eastern-command.png" alt="Eastern Naval Command" width={72} height={72} style={{ objectFit: 'contain' }} priority />
      </div>
      <div style={{ fontSize: '0.7rem', color: '#555', letterSpacing: '0.6em', marginBottom: '1.5rem', textAlign: 'center' }}>
        File Status Information System: Information Kiosk
      </div>

      {/* Login Card */}
      <div style={{
        width: '100%', maxWidth: 460, background: '#fff',
        border: '1px solid #E2E8F0', borderTop: '4px solid #000080',
        borderRadius: 8, padding: '1.5rem',
      }}>
        <div style={{
          fontFamily: 'Arial, sans-serif', fontSize: '0.76rem', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: '#000080',
          marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #E2E8F0',
        }}>
          Department Login
        </div>

        {error && (
          <div style={{
            marginBottom: '0.75rem', border: '1px solid #f5b7b7', background: '#fff4f4',
            color: '#8f1d1d', borderRadius: 4, padding: '0.6rem 0.75rem', fontSize: '0.78rem',
          }} role="alert">{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Department/Username Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label htmlFor="kiosk-dept" style={{
              fontFamily: 'Arial, sans-serif', fontSize: '0.66rem', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: '#333',
            }}>Select Department</label>
            <select
              id="kiosk-dept"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={{
                minHeight: 48, width: '100%', border: '1px solid #c7d1e0',
                borderRadius: 4, background: '#fff', color: '#333',
                padding: '0 0.875rem', fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              {kioskUsers.length === 0 && <option value="">Loading...</option>}
              {kioskUsers.map(u => (
                <option key={u.username} value={u.username}>{u.department ?? u.username}</option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label htmlFor="kiosk-pass" style={{
              fontFamily: 'Arial, sans-serif', fontSize: '0.66rem', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: '#333',
            }}>Password</label>
            <input
              id="kiosk-pass"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter department password"
              required
              style={{
                minHeight: 48, width: '100%', border: '1px solid #c7d1e0',
                borderRadius: 4, background: '#fff', color: '#333',
                padding: '0 0.875rem', fontSize: '0.9rem',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.4rem', minHeight: 48, width: '100%',
              border: '1px solid #000080', borderRadius: 4,
              background: '#000080', color: '#fff',
              fontFamily: 'Arial, sans-serif', fontSize: '0.74rem',
              fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1,
            }}
          >
            {loading ? 'Authenticating...' : 'Submit'}
          </button>
        </form>

        <div style={{
          marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0',
          textAlign: 'center', fontFamily: 'Arial, sans-serif', fontSize: '0.58rem',
          fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#616161',
        }}>
          Restricted Access - Authorised Department Personnel Only
        </div>
      </div>
    </div>
  );
}
