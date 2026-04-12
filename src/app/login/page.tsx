'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';

type UserEntry = { username: string; role: string; department: string | null };

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch usernames for dropdown on mount
  useEffect(() => {
    fetch('/api/users/list')
      .then(r => r.json())
      .then((data: UserEntry[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setUsers(data);
          setUsername(data[0].username);
        }
      })
      .catch(() => {});
  }, []);

  const selectedUser = users.find(u => u.username === username);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const department = selectedUser?.department ?? 'Logistics';
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, department }),
      });
      if (res.ok) {
        const data = await res.json();
        // KIOSK_USER -> kiosk, MAILMAN -> /admin/scan, others -> /admin
        const role = data.role ?? selectedUser?.role ?? '';
        if (role === 'KIOSK_USER') {
          router.push(`/kiosk/home?department=${encodeURIComponent(department)}`);
        } else if (role === 'MAILMAN_INTERNAL' || role === 'MAILMAN_EXTERNAL' || role === 'MAILMAN') {
          router.push('/admin/scan');
        } else {
          router.push('/admin');
        }
        router.refresh();
      } else {
        const d = await res.json();
        setError(d.error ?? 'Authentication failed. Check credentials and try again.');
      }
    } catch {
      setError('Network error. Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>

      {/* Organisation Header */}
      <div className={styles.header}>
        <div className={styles.logos}>
          <Image
            src="/logo/ins-dega.png"
            alt="INS Dega Crest"
            width={72}
            height={72}
            className={styles.logoImage}
            priority
          />
          <div>
            <div className={styles.orgTitle}>INS DEGA</div>
            <div className={styles.orgSub}>Eastern Naval Command - Indian Navy</div>
          </div>
          <Image
            src="/logo/eastern-command.png"
            alt="Eastern Naval Command Badge"
            width={72}
            height={72}
            className={styles.logoImage}
            priority
          />
        </div>
        <div className={styles.orgSub} style={{ marginTop: '0.5rem' }}>
          Logistics Department — File Status Management System
        </div>
      </div>

      {/* Login Card */}
      <div className={styles.card} role="main">
        <div className={styles.cardTitle}>Authorised Personnel Access</div>

        {error && (
          <div className={styles.errorAlert} role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.form}>

          {/* Username Dropdown (per PDF spec: "Username is selected from the dropdown") */}
          <div className={styles.inputGroup}>
            <label htmlFor="login-username">Username</label>
            <select
              id="login-username"
              className={styles.inputField}
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            >
              {users.length === 0 && <option value="">Loading...</option>}
              {users.map(u => (
                <option key={u.username} value={u.username}>
                  {u.username} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div className={styles.inputGroup}>
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className={styles.inputField}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </div>

          {/* Role and Department display */}
          {selectedUser && (
            <div style={{
              padding: '0.5rem 0.75rem',
              background: '#f0f0f8',
              border: '1px solid var(--accent-border)',
              borderRadius: 4,
              fontSize: '0.72rem',
              color: '#555',
            }}>
              <div><strong>Role:</strong> {selectedUser.role}</div>
              <div><strong>Department:</strong> {selectedUser.department ?? 'N/A'}</div>
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Classification Footer */}
        <div className={styles.footerNotice}>
          Restricted Access - Authorised Personnel Only
        </div>
      </div>
    </div>
  );
}
