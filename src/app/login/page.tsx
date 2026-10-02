'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [portal, setPortal] = useState<'select' | 'admin' | 'user'>('select');
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
        body: JSON.stringify({
          username,
          password,
          portal: 'staff',
          role: portal === 'admin' ? 'ADMIN' : 'USER',
        }),
      });
      if (res.ok) {
        router.replace('/admin');
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

  if (portal === 'select') {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card} role="main">
          <div className={styles.cardTitle}>Select Login Type</div>
          <div className={styles.portalSelect}>
            <button
              type="button"
              className={styles.portalButton}
              onClick={() => setPortal('admin')}
            >
              Admin
            </button>
            <button
              type="button"
              className={styles.portalButton}
              onClick={() => setPortal('user')}
            >
              User
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>

      {/* Login Card — the global TopNav (variant="login") above already
          carries the org branding, so this page doesn't repeat it. */}
      <div className={`${styles.card} ${styles.formCard}`} role="main">
        <button type="button" className={styles.backLink} onClick={() => setPortal('select')}>
          ‹ Back
        </button>
        <div className={styles.cardTitle}>{portal === 'admin' ? 'Admin Login' : 'User Login'}</div>

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

          <Button id="login-submit" type="submit" fullWidth disabled={loading} className={styles.submit}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
}
