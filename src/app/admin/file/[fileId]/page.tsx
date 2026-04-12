'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import { STAGES, formatINR, formatDate, formatDateTime } from '@/lib/qrService';
import { buildKioskTrackUrl } from '@/lib/trackingId';

type History = {
  id: string;
  stageName: string;
  inspectionBy: string;
  remarks: string;
  timestamp: string;
};

type FileData = {
  id: string;
  smsRefNo: string;
  fileId: string;
  secureTrackingId: string;
  description: string;
  proposalValue: number;
  head: string;
  department: string;
  typeProcessing: string;
  status: string;
  dateSubmission: string;
  histories: History[];
};

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(d: string | Date) {
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

export default function FileDetailPage() {
  const { fileId }     = useParams<{ fileId: string }>();
  const router          = useRouter();
  const searchParams    = useSearchParams();

  const [file,      setFile]      = useState<FileData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [userRole,  setUserRole]  = useState('');

  // Update form state
  const [stageName,     setStageName]     = useState('');
  const [inspectionBy,  setInspectionBy]  = useState('');
  const [remarks,       setRemarks]       = useState('');
  const [updating,      setUpdating]      = useState(false);
  const [updateMsg,     setUpdateMsg]     = useState('');

  const backHref = (() => {
    const from = searchParams.get('from');
    const to   = searchParams.get('to');
    const p    = new URLSearchParams();
    if (from) p.set('from', from);
    if (to)   p.set('to', to);
    const qs = p.toString();
    return qs ? `/admin/files?${qs}` : '/admin/files';
  })();

  const loadFile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/qr-resolver?id=${fileId}`);
      if (!res.ok) { setError('File not found.'); return; }
      const { file: f } = await res.json();
      setFile(f);
      const allowedStages = STAGES.filter(s => f.proposalValue <= 100000 ? s.key !== 'IFA' : true);
      const currIdx = allowedStages.findIndex(s => s.key === f.status);
      const nextIdx = Math.min(currIdx === -1 ? 0 : currIdx + 1, allowedStages.length - 1);
      setStageName(allowedStages[nextIdx].key);
    } catch { setError('Network error. Please try again.'); }
    finally  { setLoading(false); }
  };

  useEffect(() => {
    loadFile();
    // Detect role from stored cookie (client-side check via API)
    fetch('/api/auth/me').then(r => r.json()).then(d => setUserRole(d.role ?? '')).catch(() => {});
  }, [fileId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUpdating(true);
    setUpdateMsg('');
    try {
      const res = await fetch(`/api/files/${file.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageName, inspectionBy, remarks }),
      });
      if (res.ok) {
        setUpdateMsg('Status updated successfully.');
        await loadFile();
        setRemarks('');
        setTimeout(() => setUpdateMsg(''), 4000);
      } else {
        const d = await res.json();
        setUpdateMsg(d.error ?? 'Update failed.');
      }
    } catch { setUpdateMsg('Network error.'); }
    finally  { setUpdating(false); }
  };

  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUpdating(true);
    setUpdateMsg('');
    try {
      const res = await fetch(`/api/files/${file.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageName: file.status, inspectionBy, remarks }),
      });
      if (res.ok) {
        setUpdateMsg('Remark added successfully.');
        await loadFile();
        setRemarks('');
        setTimeout(() => setUpdateMsg(''), 4000);
      } else {
        const d = await res.json();
        setUpdateMsg(d.error ?? 'Failed to add remark.');
      }
    } catch { setUpdateMsg('Network error.'); }
    finally  { setUpdating(false); }
  };

  // Render loading state
  if (loading) return (
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.75rem' }}>
        Loading File Data...
      </div>
    </div>
  );

  if (error || !file) return (
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div className="alert alert-error">{error || 'File not found.'}</div>
      <a href="/admin/files" className="btn btn-ghost">Back to File List</a>
    </div>
  );

  const canUpdateStatus = ['INWARD', 'B_LOGO'].includes(userRole);
  const canAddRemark    = ['D_LOGO', 'B_LOGO', 'INWARD'].includes(userRole);
  const isReadOnly      = userRole === 'MAILMAN';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-title">File Details</div>
          <div className="page-sub" style={{ fontFamily: 'var(--font-mono)' }}>{file.smsRefNo}</div>
        </div>
        <a
          href={backHref}
          className="btn btn-ghost"
          id="back-to-search"
          style={{ fontSize: '0.8rem', minHeight: 52, paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
        >
          Back to Search
        </a>
      </div>

      <div className="container">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

          {/* ── TABLE 1: File Information ── */}
          <div className="card">
            <div className="card-header">File Information</div>
            <div className="table-wrap" style={{ marginTop: 0 }}>
              <table className="data-table" aria-label="File Information">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Sl. No.</th>
                    <th>File Name / Description</th>
                    <th style={{ width: 180 }}>Proposal Value (INR)</th>
                    <th style={{ width: 160 }}>SMS Number</th>
                    <th style={{ width: 160 }}>File Type / Head</th>
                  </tr>
                </thead>
                <tbody>
                  <tr id="file-info-row">
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>1</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{file.description}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                        Dept: {file.department} | Processing: {file.typeProcessing}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--navy)', fontSize: '0.85rem' }}>
                      {fmtINR(file.proposalValue)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--navy)', fontSize: '0.8rem' }}>
                      {file.smsRefNo}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {file.head}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── TABLE 2: Status Summary ── */}
          <div className="card">
            <div className="card-header">
              Status Summary
              <span style={{ float: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                {file.histories.length} stage{file.histories.length !== 1 ? 's' : ''} recorded
              </span>
            </div>
            <div className="table-wrap" style={{ marginTop: 0 }}>
              <table className="data-table" aria-label="Status Summary">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>#</th>
                    <th style={{ width: 170 }}>Stage</th>
                    <th style={{ width: 150 }}>Date of Submission</th>
                    <th style={{ width: 200 }}>Inspection Done By</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {file.histories.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No status history recorded yet.
                      </td>
                    </tr>
                  )}
                  {file.histories.map((h, i) => {
                    const isLatest = i === file.histories.length - 1;
                    return (
                      <tr key={h.id} style={{ background: isLatest ? 'var(--navy-faint)' : 'transparent' }}>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                          {i + 1}
                        </td>
                        <td>
                          <span style={{
                            fontFamily: 'Arial, Helvetica, sans-serif',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            color: 'var(--navy)',
                          }}>
                            {h.stageName}
                          </span>
                          {isLatest && (
                            <span style={{
                              marginLeft: 8,
                              fontSize: '0.55rem',
                              fontWeight: 700,
                              background: 'var(--navy)',
                              color: '#fff',
                              padding: '1px 6px',
                              borderRadius: 2,
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              fontFamily: 'Arial, Helvetica, sans-serif',
                            }}>
                              Current
                            </span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                          {fmtDate(h.timestamp)}
                        </td>
                        <td style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                          {h.inspectionBy}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {h.remarks}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── QR CODE + UPDATE FORM ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--space-lg)', alignItems: 'start' }}>

            {/* QR Code */}
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-header" style={{ textAlign: 'left' }}>QR Code</div>
              <div className="qr-wrapper" style={{ display: 'inline-block', margin: '0 auto var(--space-md)' }}>
                <QRCode
                  value={file.secureTrackingId ? buildKioskTrackUrl(file.secureTrackingId) : file.fileId}
                  size={160}
                  level="H"
                />
              </div>
              <div className="qr-ref" style={{ fontSize: '0.75rem' }}>{file.smsRefNo}</div>
              {file.secureTrackingId && (
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4, wordBreak: 'break-all' }}>
                  {file.secureTrackingId}
                </div>
              )}
              <div style={{ marginTop: 'var(--space-sm)', fontSize: '0.62rem', color: 'var(--text-secondary)', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                Scan to open isolated kiosk tracking view
              </div>
            </div>

            {/* Update Section */}
            {!isReadOnly && (
              <div className="card">
                {canUpdateStatus && (
                  <>
                    <div className="card-header">Update File Stage</div>
                    {updateMsg && (
                      <div className={`alert ${updateMsg.includes('success') ? 'alert-success' : 'alert-error'} mb-md`} role="alert">
                        {updateMsg}
                      </div>
                    )}
                    <form onSubmit={handleUpdate} id="update-stage-form" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                      <div className="input-group">
                        <label htmlFor="stage-select">Stage</label>
                        <select id="stage-select" className="input-field" value={stageName} onChange={e => setStageName(e.target.value)} required>
                          {STAGES.filter(s => file.proposalValue <= 100000 ? s.key !== 'IFA' : true).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                      </div>
                      <div className="input-group">
                        <label htmlFor="inspection-by">Inspection Done By</label>
                        <input id="inspection-by" type="text" className="input-field" value={inspectionBy} onChange={e => setInspectionBy(e.target.value)} placeholder="Rank and Name" required />
                      </div>
                      <div className="input-group">
                        <label htmlFor="update-remarks">Remarks</label>
                        <input id="update-remarks" type="text" className="input-field" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Action taken on this file" required />
                      </div>
                      <button type="submit" className="btn btn-primary w-full" id="push-update-btn" disabled={updating}>
                        {updating ? 'Updating...' : 'Push Status Update'}
                      </button>
                    </form>
                  </>
                )}

                {/* D_LOGO: remarks only */}
                {!canUpdateStatus && canAddRemark && (
                  <>
                    <div className="card-header">Add Remark</div>
                    {updateMsg && (
                      <div className={`alert ${updateMsg.includes('success') ? 'alert-success' : 'alert-error'} mb-md`} role="alert">
                        {updateMsg}
                      </div>
                    )}
                    <div className="alert alert-info mb-md" role="note">
                      D Logo access: remarks can be added but the file stage cannot be altered.
                    </div>
                    <form onSubmit={handleAddRemark} id="add-remark-form" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                      <div className="input-group">
                        <label htmlFor="remark-by">Reviewed By</label>
                        <input id="remark-by" type="text" className="input-field" value={inspectionBy} onChange={e => setInspectionBy(e.target.value)} placeholder="Rank and Name" required />
                      </div>
                      <div className="input-group">
                        <label htmlFor="remark-text">Remark</label>
                        <input id="remark-text" type="text" className="input-field" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Enter remark" required />
                      </div>
                      <button type="submit" className="btn btn-primary w-full" id="add-remark-btn" disabled={updating}>
                        {updating ? 'Saving...' : 'Add Remark'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {isReadOnly && (
              <div className="card">
                <div className="card-header">Access Level</div>
                <div className="alert alert-info" role="note" style={{ marginBottom: 0 }}>
                  Mailman access: read-only view. File updates are not permitted from this terminal.
                </div>
              </div>
            )}
          </div>

          {/* Large Back to Search button */}
          <div style={{ textAlign: 'center', paddingBottom: 'var(--space-xl)' }}>
            <a
              href={backHref}
              className="btn btn-ghost"
              id="back-to-search-bottom"
              style={{ fontSize: '0.85rem', padding: '0 2.5rem', minHeight: 56 }}
            >
              Back to Search
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
