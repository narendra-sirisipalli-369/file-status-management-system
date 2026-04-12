'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function MailmanScanPage() {
  const router = useRouter();
  const [scanInput, setScanInput] = useState('');
  const [message,   setMessage]   = useState('');
  const [status,    setStatus]    = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [stageAction, setStageAction] = useState<'Received' | 'Submitted'>('Received');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = scanInput.trim();
    if (!raw) return;

    setStatus('loading');
    setMessage('Resolving QR code...');

    try {
      // First resolve the QR to get the file
      const resolveRes = await fetch(`/api/qr-resolver?id=${encodeURIComponent(raw)}`);
      if (!resolveRes.ok) {
        setStatus('error');
        setMessage('File not found for that QR code or tracking ID.');
        setScanInput('');
        inputRef.current?.focus();
        return;
      }
      const { file } = await resolveRes.json();

      // Push the status update (MAILMAN is limited server-side)
      const updateRes = await fetch(`/api/files/${file.id}/mailman`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageName: stageAction }),
      });

      if (updateRes.ok) {
        setStatus('success');
        setMessage(`File "${file.smsRefNo}" marked as "${stageAction}" successfully.`);
      } else {
        const d = await updateRes.json();
        setStatus('error');
        setMessage(d.error ?? 'Update failed.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }

    setScanInput('');
    setTimeout(() => {
      setStatus('idle');
      setMessage('');
      inputRef.current?.focus();
    }, 5000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-xl)',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: 500,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-2xl)',
        boxShadow: 'var(--elevate-3)',
      }}>
        <div style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '0.75rem',
          fontWeight: 800,
          letterSpacing: 'var(--letter-spacing-wide)',
          textTransform: 'uppercase',
          color: 'var(--navy)',
          marginBottom: 'var(--space-md)',
          paddingBottom: 'var(--space-sm)',
          borderBottom: '1px solid var(--border)',
        }}>
          Personnel: File Movement Interface
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
          Scan the QR code on the physical file to update its movement status.
          Select the action before scanning.
        </p>

        {/* Action selector */}
        <div className="input-group" style={{ marginBottom: 'var(--space-lg)' }}>
          <label htmlFor="stage-action">Mark File As</label>
          <select
            id="stage-action"
            className="input-field"
            value={stageAction}
            onChange={e => setStageAction(e.target.value as 'Received' | 'Submitted')}
          >
            <option value="Received">Received</option>
            <option value="Submitted">Submitted</option>
          </select>
        </div>

        {/* Scanner input */}
        <form onSubmit={handleScan} id="mailman-scan-form">
          <div className="scanner-box" style={{ marginBottom: 'var(--space-md)' }}>
            <div className="scanner-indicator" />
            <input
              ref={inputRef}
              id="scan-input"
              type="text"
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              placeholder="Scan QR or enter tracking ID"
              autoComplete="off"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--navy)' }}
            />
          </div>

          <button
            id="process-scan-btn"
            type="submit"
            className="btn btn-primary w-full"
            disabled={status === 'loading' || !scanInput.trim()}
          >
            {status === 'loading' ? 'Processing...' : `Mark as ${stageAction}`}
          </button>
        </form>

        {message && (
          <div
            className={`alert ${status === 'success' ? 'alert-success' : status === 'error' ? 'alert-error' : 'alert-info'}`}
            style={{ marginTop: 'var(--space-md)', marginBottom: 0 }}
            role="alert"
            aria-live="assertive"
          >
            {message}
          </div>
        )}

        <div style={{
          marginTop: 'var(--space-xl)',
          fontSize: '0.6rem',
          color: 'var(--text-muted)',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          Mailman Access: Movement Tracking Only
        </div>
      </div>

      <a href="/api/auth/logout" className="btn btn-ghost" style={{ marginTop: 'var(--space-xl)', color: 'var(--text-muted)' }}>
        Sign Out
      </a>
    </div>
  );
}
