'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import styles from './page.module.css';

const DEPARTMENTS = ['Logistics', 'INAS 321', 'INAS 324', 'INAS 551', 'RO', 'INAS 333', 'ALD', 'BLO'] as const;

export default function KioskLoginPage() {
  const router = useRouter();

  const [department, setDepartment] = useState<string>('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canEnterCreds = Boolean(department);

  const departmentHint = useMemo(() => {
    if (!department) return '';
    // Optional helper mapping for the seeded kiosk usernames.
    // Logistics -> logistics, INAS 321 -> inas321, etc.
    const normalized = department.toLowerCase().replace(/\s+/g, '');
    return normalized;
  }, [department]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department) {
      setError('Please select a department first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, department, portal: 'kiosk' }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? 'Authentication failed. Check credentials and try again.');
        return;
      }

      const role = data.role ?? '';
      if (role !== 'KIOSK_USER') {
        setError('This portal is for Kiosk users only. Please use Staff Login.');
        return;
      }

      const loginDepartment = data.loginDepartment ?? department;
      router.replace(`/kiosk/home?department=${encodeURIComponent(loginDepartment)}`);
      router.refresh();
    } catch {
      setError('Network error. Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.orgPanel}>
          <div className={styles.logos}>
            <div>
              <div className={styles.orgTitle}>INS DEGA</div>
              <div className={styles.orgSub}>Eastern Naval Command - Indian Navy</div>
            </div>
          </div>
          <div className={styles.orgSub} style={{ marginTop: '0.5rem' }}>
            Department Kiosk — File Status Management System
          </div>
        </div>
      </div>

      <div className={styles.card} role="main">
        <div className={styles.cardTitle}>Kiosk User Access</div>

        {error && (
          <div className={styles.errorAlert} role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.form} autoComplete="off">
          <div className={styles.inputGroup}>
            <label htmlFor="kiosk-department">Department</label>
            <select
              id="kiosk-department"
              className={`${styles.inputField} ${styles.selectField}`}
              value={department}
              onChange={e => {
                setDepartment(e.target.value);
                setError('');
              }}
              required
            >
              <option value="" disabled>Select department</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="kiosk-username">Username</label>
            <input
              id="kiosk-username"
              type="text"
              className={styles.inputField}
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={departmentHint ? `e.g. ${departmentHint}` : 'Select department first'}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              required
              disabled={!canEnterCreds}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="kiosk-password">Password</label>
            <div className={styles.passwordRow}>
              <input
                id="kiosk-password"
                type={showPassword ? 'text' : 'password'}
                className={`${styles.inputField} ${styles.passwordField}`}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={canEnterCreds ? 'Enter password' : 'Select department first'}
                autoComplete="off"
                required
                disabled={!canEnterCreds}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onMouseDown={e => e.preventDefault()}
                onClick={() => setShowPassword(v => !v)}
                disabled={!canEnterCreds}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !canEnterCreds}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className={styles.footerNotice}>
          Restricted Access - Authorised Department Personnel Only
        </div>
      </div>
    </div>
  );
}
