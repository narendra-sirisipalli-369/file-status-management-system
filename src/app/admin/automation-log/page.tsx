'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';

type SmsStatus = 'PENDING' | 'SENT';

type SmsRow = {
  id: string;
  recipient: string;
  message: string;
  status: SmsStatus;
  createdAt: string;
  sentAt: string | null;
  smsRefNo: string | null;
  departmentName: string | null;
  actorUsername: string | null;
};

type ScanResult = 'OPENED' | 'ADVANCED' | 'SKIPPED' | 'NOT_FOUND' | 'ERROR';

type ScanRow = {
  id: string;
  rawIdentifier: string;
  result: ScanResult;
  message: string;
  createdAt: string;
  smsRefNo: string | null;
  description: string | null;
  actorUsername: string | null;
};

function fmtDateTime(v: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/** globals.css only defines color variants for a couple of badge classes
    (badge-done, badge-inward, ...) — inline colors here so every status
    actually renders with a distinct color instead of falling back to the
    plain, colorless .badge base style. */
function coloredBadge(label: string, bg: string, color: string) {
  return (
    <span className="badge" style={{ background: bg, color, borderColor: color }}>
      {label}
    </span>
  );
}

function smsStatusBadge(status: SmsStatus) {
  return status === 'SENT'
    ? coloredBadge('Sent', '#e8f5e8', '#1a7a09')
    : coloredBadge('Pending', '#fff8e3', '#8b5e00');
}

function scanResultBadge(result: ScanResult) {
  const map: Record<ScanResult, { label: string; bg: string; color: string }> = {
    OPENED: { label: 'Opened', bg: '#e8f0ff', color: '#0055aa' },
    ADVANCED: { label: 'Advanced', bg: '#e8f5e8', color: '#1a7a09' },
    SKIPPED: { label: 'Skipped', bg: '#fff8e3', color: '#8b5e00' },
    NOT_FOUND: { label: 'Not Found', bg: '#fff0f0', color: '#cc0000' },
    ERROR: { label: 'Error', bg: '#fff0f0', color: '#cc0000' },
  };
  const { label, bg, color } = map[result];
  return coloredBadge(label, bg, color);
}

export default function AutomationLogPage() {
  const [smsRows, setSmsRows] = useState<SmsRow[]>([]);
  const [scanRows, setScanRows] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [smsRes, scanRes] = await Promise.all([
        fetch('/api/sms-queue'),
        fetch('/api/scan-log'),
      ]);
      if (!smsRes.ok || !scanRes.ok) {
        setError('Failed to load automation log.');
        return;
      }
      setSmsRows(await smsRes.json());
      setScanRows(await scanRes.json());
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pendingCount = smsRows.filter((r) => r.status === 'PENDING').length;
  const sentCount = smsRows.filter((r) => r.status === 'SENT').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <PageHeader
        title="Automation Log"
        subtitle="QR scan activity, and which stage-change messages have gone out to department kiosks vs. are still waiting."
        actions={<button type="button" className="btn btn-ghost" onClick={load} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>}
      />

      <div className="container">
        {error && <div className="alert alert-error mb-lg">{error}</div>}

        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="card-header">
            Message Log
            <span style={{ float: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              {sentCount} sent · {pendingCount} pending
            </span>
          </div>
          <div className="table-wrap table-scroll-box" style={{ marginTop: 0 }}>
            <table className="data-table compact" aria-label="Message Log">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>File No</th>
                  <th>Recipient</th>
                  <th>Message</th>
                  <th>Department</th>
                  <th>Queued</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</td></tr>
                )}
                {!loading && smsRows.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No messages queued yet.</td></tr>
                )}
                {!loading && smsRows.map((r) => (
                  <tr key={r.id}>
                    <td>{smsStatusBadge(r.status)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{r.smsRefNo ?? '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{r.recipient}</td>
                    <td style={{ maxWidth: 320, fontSize: '0.78rem' }}>{r.message}</td>
                    <td style={{ fontSize: '0.78rem' }}>{r.departmentName ?? '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{fmtDateTime(r.createdAt)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{fmtDateTime(r.sentAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            Barcode / QR Scan Log
            <span style={{ float: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              {scanRows.length} scan{scanRows.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="table-wrap table-scroll-box" style={{ marginTop: 0 }}>
            <table className="data-table compact" aria-label="Barcode Scan Log">
              <thead>
                <tr>
                  <th>Result</th>
                  <th>File No</th>
                  <th>Description</th>
                  <th>Detail</th>
                  <th>By</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</td></tr>
                )}
                {!loading && scanRows.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No scans recorded yet.</td></tr>
                )}
                {!loading && scanRows.map((r) => (
                  <tr key={r.id}>
                    <td>{scanResultBadge(r.result)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{r.smsRefNo ?? '—'}</td>
                    <td className="preserve-case" style={{ fontSize: '0.78rem' }}>{r.description ?? '—'}</td>
                    <td style={{ fontSize: '0.78rem' }}>{r.message}</td>
                    <td style={{ fontSize: '0.78rem' }}>{r.actorUsername ?? '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{fmtDateTime(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
