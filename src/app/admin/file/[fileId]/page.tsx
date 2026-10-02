'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import { formatDate, formatTime, buildFileUrl } from '@/lib/qrService';
import { STAGE_ADVANCED_EVENT } from '@/components/GlobalScanListener';

const PRINT_SERVICE_URL = 'http://localhost:8787/print';

type RemarksByOption = { id: string; name: string };

type HistoryEntry = {
  id: string;
  action: string;
  stageName: string | null;
  remarks: string | null;
  remarksByName: string | null;
  actorUsername: string | null;
  timestamp: string;
};

type FileStageRow = {
  id: string;
  stageId: string;
  sequenceOrder: number;
  enteredAt: string | null;
  enteredById: string | null;
  exitedAt: string | null;
  exitedById: string | null;
  skipped: boolean;
  remarks: string | null;
  stageName: string;
};

type FileData = {
  id: string;
  smsRefNo: string;
  fileId: string;
  secureTrackingId: string;
  description: string;
  proposalValue: string;
  status: string;
  currentStageId: string | null;
  currentStageName: string | null;
  departmentName: string;
  procurementModeName: string;
  authorityName: string;
  headCodeCode: string;
  headCodeName: string;
  dateSubmission: string;
  createdAt: string;
  histories: HistoryEntry[];
  stages: FileStageRow[];
};

function DateTimeCell({ value }: { value: string | null }) {
  if (!value) return <>—</>;
  return (
    <div style={{ lineHeight: 1.3 }}>
      <div>{formatDate(value)}</div>
      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{formatTime(value)}</div>
    </div>
  );
}

function fmtINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

/** Master Data's Head Code entries save Name = Code (no separate descriptive label), so drop the redundant " — name" suffix when they're identical. */
function headCodeLabel(code: string, name: string): string {
  return name && name !== code ? `${code} — ${name}` : code;
}

export default function FileDetailPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const searchParams = useSearchParams();

  const [file, setFile] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const qrWrapperRef = useRef<HTMLDivElement | null>(null);

  const NONE = 'NONE';
  const [remarksByOptions, setRemarksByOptions] = useState<RemarksByOption[]>([]);
  const [remarksById, setRemarksById] = useState(NONE);
  const [remarksText, setRemarksText] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const downloadQrPng = async (smsRefNo: string) => {
    const svg = qrWrapperRef.current?.querySelector('svg');
    if (!svg) return;

    const safeBaseName = (smsRefNo || 'QR_CODE').trim().replace(/[\/\\?%*:|"<>]/g, '_');
    const filename = `${safeBaseName}.png`;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const size = 160;
      const scale = 6;
      const canvas = document.createElement('canvas');
      canvas.width = size * scale;
      canvas.height = size * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to render QR image'));
        img.src = svgUrl;
      });

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });
      if (!blob) return;

      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(pngUrl);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  /** Re-sends the same QR to the local Zebra printer — for when the original printed label was lost or damaged. */
  const handleReprintQr = async () => {
    if (!file) return;
    setPrinting(true);
    setPrintStatus(null);
    try {
      const res = await fetch(PRINT_SERVICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrData: buildFileUrl(file.fileId),
          fileName: file.smsRefNo,
        }),
      });
      const result = await res.json();
      if (res.ok && result.ok) {
        setPrintStatus({ ok: true, message: `QR printed successfully. File Number: ${file.smsRefNo}` });
      } else {
        setPrintStatus({ ok: false, message: result.error ?? 'Print failed. Please retry.' });
      }
    } catch {
      setPrintStatus({
        ok: false,
        message: 'Zebra printer service is not available. Please make sure the local Zebra print service is running.',
      });
    } finally {
      setPrinting(false);
    }
  };

  const backHref = (() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    const qs = p.toString();
    return qs ? `/admin/files?${qs}` : '/admin/files';
  })();

  const loadFile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/qr-resolver?id=${fileId}`);
      if (!res.ok) {
        setError('File not found.');
        return;
      }
      const { file: f } = await res.json();
      setFile(f);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFile();
    fetch('/api/remarks-by').then((r) => r.json()).then((d) => Array.isArray(d) && setRemarksByOptions(d));
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setRole(d.role ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  // GlobalScanListener fetches client-side too, so a scan-confirmed advance
  // while this exact file is already open needs an explicit nudge to reload.
  useEffect(() => {
    const onStageAdvanced = (e: Event) => {
      const detail = (e as CustomEvent<{ fileId: string }>).detail;
      if (detail?.fileId === fileId) loadFile();
    };
    window.addEventListener(STAGE_ADVANCED_EVENT, onStageAdvanced);
    return () => window.removeEventListener(STAGE_ADVANCED_EVENT, onStageAdvanced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  const isAdminUser = role === 'ADMIN';
  const currentStage = file?.stages.find((s) => s.stageId === file.currentStageId) ?? null;
  const canExit = isAdminUser && !!currentStage && !currentStage.exitedAt;

  const runStageAction = async (body: Record<string, unknown>, successMsg: string) => {
    if (!file) return;
    setUpdating(true);
    setUpdateMsg('');
    try {
      const res = await fetch(`/api/files/${file.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setUpdateMsg(successMsg);
        await loadFile();
        setRemarksById(NONE);
        setRemarksText('');
        setTimeout(() => setUpdateMsg(''), 4000);
      } else {
        const d = await res.json();
        setUpdateMsg(d.error ?? 'Update failed.');
      }
    } catch {
      setUpdateMsg('Network error.');
    } finally {
      setUpdating(false);
    }
  };

  const handleAdvance = () =>
    runStageAction(
      {
        action: 'EXIT',
        remarks: remarksById !== NONE && remarksText.trim() ? remarksText.trim() : null,
        remarksById: remarksById !== NONE ? remarksById : null,
      },
      'Stage exited — file advanced.'
    );

  /** Sends the remarks as a message without exiting the stage — the file stays put. */
  const handleSend = () =>
    runStageAction(
      { action: 'SEND', remarks: remarksText.trim(), remarksById: remarksById !== NONE ? remarksById : null },
      'Remarks sent — file remains in this stage.'
    );

  const handleSkip = () => {
    if (!confirm('Skip this stage without sending a message?')) return;
    runStageAction({ action: 'SKIP' }, 'Stage skipped — file advanced.');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.75rem' }}>
          Loading File Data...
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div className="alert alert-error">{error || 'File not found.'}</div>
        <a href="/admin/files" className="btn btn-ghost">Back to File List</a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div className="page-header">
        <div>
          <div className="page-title">File Details</div>
          <div className="page-sub" style={{ fontFamily: 'var(--font-mono)' }}>{file.smsRefNo}</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button
            type="button"
            className="btn btn-ghost"
            id="view-qr-code"
            style={{ fontSize: '0.8rem', minHeight: 52, paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
            onClick={() => { setPrintStatus(null); setShowQrModal(true); }}
          >
            QR Code
          </button>
          <a href={backHref} className="btn btn-ghost" id="back-to-search" style={{ fontSize: '0.8rem', minHeight: 52, paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
            Back to Search
          </a>
        </div>
      </div>

      <div className="container">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

          {/* ── File Information ── */}
          <div className="card">
            <div className="card-header">File Information</div>
            <div className="table-wrap" style={{ marginTop: 0 }}>
              <table className="data-table" aria-label="File Information">
                <thead>
                  <tr>
                    <th>Case Description</th>
                    <th style={{ width: 180 }}>Proposal Value (INR)</th>
                    <th style={{ width: 160 }}>File No</th>
                    <th style={{ width: 160 }}>Head Code</th>
                    <th style={{ width: 180 }}>Authority</th>
                    <th style={{ width: 140 }}>File Status</th>
                    <th style={{ width: 170 }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  <tr id="file-info-row">
                    <td>
                      <div className="preserve-case" style={{ fontWeight: 600 }}>{file.description}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                        Dept: {file.departmentName} | Mode: {file.procurementModeName}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--navy)', fontSize: '0.85rem' }}>
                      {fmtINR(Number(file.proposalValue))}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--navy)', fontSize: '0.8rem' }}>{file.smsRefNo}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{headCodeLabel(file.headCodeCode, file.headCodeName)}</td>
                    <td style={{ fontSize: '0.8rem' }}>{file.authorityName || '-'}</td>
                    <td style={{ fontSize: '0.78rem', fontWeight: 700 }}>{file.status}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}><DateTimeCell value={file.createdAt} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Stage Checklist ── */}
          <div className="card">
            <div className="card-header">
              Stage Progress
              <span style={{ float: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                {file.stages.filter((s) => s.exitedAt).length} / {file.stages.length} stages complete
              </span>
            </div>
            <div className="table-wrap" style={{ marginTop: 0 }}>
              <table className="data-table" aria-label="Stage Progress">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Stage</th>
                    <th style={{ width: 170 }}>Entered</th>
                    <th style={{ width: 170 }}>Exited</th>
                    <th style={{ width: 160 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {file.stages.map((s) => {
                    const isCurrent = s.stageId === file.currentStageId;
                    return (
                      <tr key={s.id} style={{ background: isCurrent ? 'var(--navy-faint)' : 'transparent' }}>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{s.sequenceOrder}</td>
                        <td>
                          <span style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: 'var(--navy)' }}>{s.stageName}</span>
                          {isCurrent && (
                            <span style={{ marginLeft: 8, fontSize: '0.55rem', fontWeight: 700, background: 'var(--navy)', color: '#fff', padding: '1px 6px', borderRadius: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Current
                            </span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}><DateTimeCell value={s.enteredAt} /></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}><DateTimeCell value={s.exitedAt} /></td>
                        <td>
                          {isCurrent && canExit ? (
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button type="button" className="btn btn-primary" style={{ fontSize: '0.7rem', padding: '4px 10px' }} disabled={updating} onClick={handleAdvance}>
                                Exit
                              </button>
                              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '4px 10px' }} disabled={updating} onClick={handleSkip}>
                                Skip
                              </button>
                            </div>
                          ) : (
                            s.exitedAt ? (s.skipped ? 'Skipped' : 'Complete') : s.enteredAt ? 'In progress' : 'Pending'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {file.stages.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No stages configured.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {currentStage && isAdminUser && (
              <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  className="input-field"
                  value={remarksById}
                  onChange={(e) => setRemarksById(e.target.value)}
                  style={{ maxWidth: 200 }}
                  aria-label="Remarks By"
                >
                  <option value={NONE}>Remarks By: None</option>
                  {remarksByOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                {remarksById !== NONE && (
                  <>
                    <input
                      type="text"
                      className="input-field"
                      value={remarksText}
                      onChange={(e) => setRemarksText(e.target.value)}
                      placeholder={`Remarks for ${currentStage.stageName}`}
                      style={{ flex: 1, minWidth: 200 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.7rem', padding: '4px 10px' }}
                      disabled={updating || !remarksText.trim()}
                      onClick={handleSend}
                      title="Send this remark as a message — the file stays in this stage."
                    >
                      Send
                    </button>
                  </>
                )}
                {updateMsg && <span style={{ fontSize: '0.72rem', color: /advanced|sent/.test(updateMsg) ? 'var(--stage-done, green)' : 'var(--stage-co, red)' }}>{updateMsg}</span>}
              </div>
            )}
            {!currentStage && <div className="alert alert-info" style={{ marginTop: 'var(--space-md)' }}>All stages complete — this file has no active stage.</div>}
          </div>

          {/* ── Status Summary ── */}
          <div className="card">
            <div className="card-header">
              Status Summary
              <span style={{ float: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                {file.histories.length} event{file.histories.length !== 1 ? 's' : ''} recorded
              </span>
            </div>
            <div className="table-wrap" style={{ marginTop: 0 }}>
              <table className="data-table" aria-label="Status Summary">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>#</th>
                    <th style={{ width: 140 }}>Action</th>
                    <th style={{ width: 170 }}>Stage</th>
                    <th style={{ width: 150 }}>Date</th>
                    <th style={{ width: 160 }}>By</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {file.histories.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No status history recorded yet.</td>
                    </tr>
                  )}
                  {file.histories.map((h, i) => (
                    <tr key={h.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{i + 1}</td>
                      <td style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--navy)' }}>{h.action === 'ADVANCED' ? 'ENTERED' : h.action}</td>
                      <td style={{ fontSize: '0.78rem' }}>{h.stageName ?? '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}><DateTimeCell value={h.timestamp} /></td>
                      <td style={{ fontWeight: 600, fontSize: '0.82rem' }}>{h.remarksByName ?? h.actorUsername ?? '—'}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{h.remarks ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {showQrModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="QR Code"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 280, margin: 'var(--space-md)', background: 'var(--bg-white)', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header" style={{ textAlign: 'left' }}>QR Code</div>
            <div ref={qrWrapperRef} className="qr-wrapper" style={{ display: 'inline-block', margin: '0 auto var(--space-md)' }}>
              <QRCode
                value={buildFileUrl(file.fileId)}
                size={160}
                level="M"
              />
            </div>
            <div className="qr-ref" style={{ fontSize: '0.75rem' }}>{file.smsRefNo}</div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, minWidth: 0, padding: '0 0.5rem' }} onClick={() => downloadQrPng(file.smsRefNo)}>
                Download
              </button>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, minWidth: 0, padding: '0 0.5rem' }} onClick={handleReprintQr} disabled={printing}>
                {printing ? 'Printing...' : 'Print Again'}
              </button>
            </div>
            {printStatus && (
              <div
                className={`alert ${printStatus.ok ? 'alert-success' : 'alert-error'}`}
                role="alert"
                style={{ marginTop: 'var(--space-sm)', fontSize: '0.7rem', textAlign: 'center' }}
              >
                {printStatus.message}
              </div>
            )}
            {file.secureTrackingId && (
              <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4, wordBreak: 'break-all' }}>{file.secureTrackingId}</div>
            )}
            <button type="button" className="btn btn-primary w-full" style={{ marginTop: 'var(--space-md)' }} onClick={() => setShowQrModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
