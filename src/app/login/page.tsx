'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, portal: 'staff' }),
      });
      if (res.ok) {
        const data = await res.json();
        // KIOSK_USER -> kiosk, MAILMAN -> /admin/scan, others -> /admin
        const role = data.role ?? '';
        if (role === 'KIOSK_USER') {
          setError('Invalid username or password');
        } else if (role === 'MAILMAN_INTERNAL' || role === 'MAILMAN_EXTERNAL' || role === 'MAILMAN') {
          router.replace('/admin/scan');
        } else {
          router.replace('/admin');
        }
        if (role !== 'KIOSK_USER') router.refresh();
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
        <div className={styles.orgPanel}>
          <div className={styles.logos}>
            <div>
              <div className={styles.orgTitle}>INS DEGA</div>
            </div>
          </div>
          <div className={styles.orgSub} style={{ marginTop: '0.5rem' }}>
            Logistics Department — File Status Management System
          </div>
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

        <form onSubmit={handleLogin} className={styles.form} autoComplete="off">

          <div className={styles.inputGroup}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className={styles.inputField}
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>

          {/* Password */}
          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <div className={styles.passwordRow}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`${styles.inputField} ${styles.passwordField}`}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="off"
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onMouseDown={e => e.preventDefault()}
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

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
