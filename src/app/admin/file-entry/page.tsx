'use client';

import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { formatINR, buildFileUrl } from '@/lib/qrService';

interface LookupOption { id: string; name: string }
interface HeadCodeEntry { id: string; code: string; name: string; majorId?: string | null; headCodeId?: string | null }
interface DepartmentOption { id: string; name: string }

/** Master Data's Head Code entries save Name = Code (no separate descriptive label), so drop the redundant " — name" suffix when they're identical. */
function headCodeLabel(code: string, name: string): string {
  return name && name !== code ? `${code} — ${name}` : code;
}

const FIELD_LABELS: Record<string, string> = {
  description: 'Case Description',
  proposalValue: 'Proposal Value',
  departmentId: 'Department',
  procurementModeId: 'Mode of Procurement',
  authorityId: 'Authority',
  majorHeadId: 'Major Head',
  minorHeadId: 'Minor Head',
  codeHeadId: 'Code Head',
};

/** Zod validation errors come back as {error: "Validation failed", details: [...]} — surface the actual per-field reason instead of the generic label. */
function describeApiError(data: { error?: string; details?: { path?: (string | number)[]; message: string }[] }): string {
  if (data.details?.length) {
    return data.details
      .map((d) => {
        const field = d.path?.[0];
        const label = typeof field === 'string' ? (FIELD_LABELS[field] ?? field) : null;
        return label ? `${label}: ${d.message}` : d.message;
      })
      .join(' ');
  }
  return data.error ?? 'Submission failed. Please verify all fields and retry.';
}
interface SimilarMatch { smsRefNo: string; description: string; similarity: number }

const PRINT_SERVICE_URL = 'http://localhost:8787/print';

export default function FileEntryPage() {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [procurementModes, setProcurementModes] = useState<LookupOption[]>([]);
  const [authorities, setAuthorities] = useState<LookupOption[]>([]);
  const [majorHeadCodes, setMajorHeadCodes] = useState<HeadCodeEntry[]>([]);
  const [headCodes, setHeadCodes] = useState<HeadCodeEntry[]>([]);
  const [headCodeItems, setHeadCodeItems] = useState<HeadCodeEntry[]>([]);
  const [majorHeadId, setMajorHeadId] = useState('');
  const [minorHeadId, setMinorHeadId] = useState('');
  const [codeHeadId, setCodeHeadId] = useState('');

  const [form, setForm] = useState({
    description: '',
    proposalValue: '',
    departmentId: '',
    procurementModeId: '',
    authorityId: '',
  });

  const [generatedFile, setGeneratedFile] = useState<{
    smsRefNo: string;
    fileId: string;
    secureTrackingId: string;
    qrText: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [similarMatches, setSimilarMatches] = useState<SimilarMatch[]>([]);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  const exactMatches = similarMatches.filter(
    (m) => m.description.trim().toLowerCase() === form.description.trim().toLowerCase()
  );
  const exactDuplicate = exactMatches[0];

  async function loadLookups() {
    const [d, pm, a, mhc, hc, items] = await Promise.all([
      fetch('/api/departments').then((r) => r.json()),
      fetch('/api/procurement-modes').then((r) => r.json()),
      fetch('/api/authorities').then((r) => r.json()),
      fetch('/api/major-head-codes').then((r) => r.json()),
      fetch('/api/head-codes').then((r) => r.json()),
      fetch('/api/head-code-items').then((r) => r.json()),
    ]);
    setDepartments(d);
    setProcurementModes(pm);
    setAuthorities(a);
    setMajorHeadCodes(mhc);
    setHeadCodes(hc);
    setHeadCodeItems(items);
    setForm((prev) => ({
      ...prev,
      departmentId: prev.departmentId || d[0]?.id || '',
      procurementModeId: prev.procurementModeId || pm[0]?.id || '',
      authorityId: prev.authorityId || a[0]?.id || '',
    }));
    setMajorHeadId((prev) => prev || mhc[0]?.id || '');
  }

  useEffect(() => {
    loadLookups();
  }, []);

  /** Major, Minor, and Code Head are picked independently — selecting one never clears the others. */
  const handleMajorChange = (e: React.ChangeEvent<HTMLSelectElement>) => setMajorHeadId(e.target.value);
  const handleMinorChange = (e: React.ChangeEvent<HTMLSelectElement>) => setMinorHeadId(e.target.value);
  const handleCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => setCodeHeadId(e.target.value);


  useEffect(() => {
    const description = form.description.trim();
    if (description.length < 3) {
      setSimilarMatches([]);
      return;
    }
    setCheckingDuplicate(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/files/check-duplicate?description=${encodeURIComponent(description)}`);
        const data = await res.json();
        setSimilarMatches(Array.isArray(data.matches) ? data.matches : []);
      } catch {
        // Non-critical — the server still enforces the exact-duplicate rule on submit.
      } finally {
        setCheckingDuplicate(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form.description]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'description') {
      setConfirmDuplicate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (exactDuplicate && !confirmDuplicate) {
      setError(`A file with this exact description already exists (${exactDuplicate.smsRefNo}). Check the confirmation below to create a new file with this name anyway, or use a different description.`);
      return;
    }
    if (!majorHeadId) {
      setError('Select a Major Head.');
      return;
    }
    setLoading(true);
    setError('');
    setGeneratedFile(null);

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          proposalValue: parseFloat(form.proposalValue),
          departmentId: form.departmentId,
          procurementModeId: form.procurementModeId,
          authorityId: form.authorityId,
          majorHeadId,
          minorHeadId: minorHeadId || null,
          codeHeadId: codeHeadId || null,
          allowDuplicate: confirmDuplicate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPrintStatus(null);
        setGeneratedFile({
          smsRefNo: data.data.smsRefNo,
          fileId: data.data.fileId,
          secureTrackingId: data.data.secureTrackingId,
          qrText: buildFileUrl(data.data.fileId),
        });
        setForm((prev) => ({ ...prev, description: '', proposalValue: '' }));
        setConfirmDuplicate(false);
      } else {
        setError(describeApiError(data));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!generatedFile) return;
    setPrinting(true);
    setPrintStatus(null);
    try {
      const res = await fetch(PRINT_SERVICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrData: generatedFile.qrText,
          fileName: generatedFile.smsRefNo,
        }),
      });
      const result = await res.json();
      if (res.ok && result.ok) {
        setPrintStatus({ ok: true, message: `QR printed successfully. File Number: ${generatedFile.smsRefNo}` });
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div className="page-header">
        <div>
          <div className="page-title">File Entry — Inward</div>
        </div>
        <a href="/admin" className="btn btn-ghost" id="back-to-home-entry">Back to Home</a>
      </div>

      <div className="container">
        <div className="grid-2" style={{ alignItems: 'stretch' }}>

          {/* ENTRY FORM */}
          <div className="glass-panel" style={{ padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', height: '100%' }}>
            <div className="section-title mb-lg" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-wide)', color: 'var(--navy)' }}>New File Registration</div>

            {error && <div className="alert alert-error mb-md" role="alert">{error}</div>}

            <form onSubmit={handleSubmit} id="file-entry-form">
              <div className="form-grid">

                <div className="input-group preserve-case" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="entry-description">Case Description</label>
                  <input
                    id="entry-description"
                    name="description"
                    type="text"
                    className="input-field"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Enter case description"
                    required
                    autoFocus
                  />
                  {checkingDuplicate && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Checking for similar names...</span>
                  )}
                  {!checkingDuplicate && exactDuplicate && (
                    <div className="alert alert-error" style={{ marginTop: 'var(--space-sm)', fontSize: '0.75rem' }}>
                      <div style={{ marginBottom: 'var(--space-sm)' }}>
                        {exactMatches.length > 1
                          ? `${exactMatches.length} files already exist with this exact description:`
                          : 'A file already exists with this exact description:'}
                      </div>
                      <select
                        className="input-field preserve-case"
                        style={{ marginBottom: 'var(--space-sm)' }}
                        defaultValue={exactMatches[0]?.smsRefNo}
                      >
                        {exactMatches.map((m) => (
                          <option key={m.smsRefNo} value={m.smsRefNo}>{m.smsRefNo} — {m.description}</option>
                        ))}
                      </select>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-xs)', fontWeight: 400, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          id="confirm-duplicate-description"
                          checked={confirmDuplicate}
                          onChange={(e) => setConfirmDuplicate(e.target.checked)}
                        />
                        <span>I understand this name already exists. Create a new file with this name anyway.</span>
                      </label>
                    </div>
                  )}
                  {!checkingDuplicate && !exactDuplicate && similarMatches.length > 0 && (
                    <div className="alert alert-info" style={{ marginTop: 'var(--space-sm)', fontSize: '0.75rem' }}>
                      A similar file name already exists — choose a different description.
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="entry-value">Proposal Value (INR)</label>
                  <input
                    id="entry-value"
                    name="proposalValue"
                    type="number"
                    className="input-field"
                    value={form.proposalValue}
                    onChange={handleChange}
                    placeholder="Amount in INR"
                    min="0.01"
                    step="0.01"
                    required
                  />
                  {form.proposalValue && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--navy)', fontFamily: 'var(--font-mono)' }}>
                      {formatINR(parseFloat(form.proposalValue))}
                    </span>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="entry-dept">Department</label>
                  <select id="entry-dept" name="departmentId" className="input-field" value={form.departmentId} onChange={handleChange}>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
                    <div>
                      <label htmlFor="entry-head-major" style={{ fontSize: '0.62rem' }}>Major Head</label>
                      <select id="entry-head-major" className="input-field" value={majorHeadId} onChange={handleMajorChange} required>
                        {!majorHeadId && <option value="">— Select —</option>}
                        {majorHeadCodes.map((h) => <option key={h.id} value={h.id}>{headCodeLabel(h.code, h.name)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="entry-head-minor" style={{ fontSize: '0.62rem' }}>Minor Head</label>
                      <select id="entry-head-minor" className="input-field" value={minorHeadId} onChange={handleMinorChange}>
                        <option value="">— None —</option>
                        {headCodes.map((h) => <option key={h.id} value={h.id}>{headCodeLabel(h.code, h.name)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="entry-head-code" style={{ fontSize: '0.62rem' }}>Code Head</label>
                      <select id="entry-head-code" className="input-field" value={codeHeadId} onChange={handleCodeChange}>
                        <option value="">— None —</option>
                        {headCodeItems.map((h) => <option key={h.id} value={h.id}>{headCodeLabel(h.code, h.name)}</option>)}
                      </select>
                    </div>
                  </div>
                  {majorHeadCodes.length === 0 && (
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>No Major head codes configured yet — add one in Master Data.</span>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="entry-type">Mode of procurement</label>
                  <select id="entry-type" name="procurementModeId" className="input-field" value={form.procurementModeId} onChange={handleChange}>
                    {procurementModes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="entry-authority">Authority</label>
                  <select id="entry-authority" name="authorityId" className="input-field" value={form.authorityId} onChange={handleChange}>
                    {authorities.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <button
                id="file-entry-submit"
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading || (!!exactDuplicate && !confirmDuplicate)}
                style={{ marginTop: 'var(--space-sm)' }}
              >
                {loading ? 'Creating File Record...' : 'Create File and Generate QR'}
              </button>
            </form>
          </div>

          {/* QR PANEL */}
          <div style={{ height: '100%' }}>
            <div className="glass-panel" style={{ padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', height: '100%', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {generatedFile ? (
                <>
                  <div style={{ textAlign: 'center' }}>
                    <div className="badge badge-done" style={{ marginBottom: 'var(--space-sm)', fontSize: '0.7rem' }}>
                      File Created Successfully
                    </div>
                  </div>
                  <div className="qr-wrapper">
                    <QRCode
                      value={generatedFile.qrText}
                      size={200}
                      level="M"
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="qr-ref" style={{ fontSize: '0.85rem', marginBottom: 4 }}>{generatedFile.smsRefNo}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--navy)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', maxWidth: 280 }}>
                      {generatedFile.secureTrackingId}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'Arial, Helvetica, sans-serif', marginTop: 'var(--space-md)' }}>
                    Print and attach this QR code to the physical file folder
                  </div>

                  {printStatus && (
                    <div
                      className={`alert ${printStatus.ok ? 'alert-success' : 'alert-error'}`}
                      role="alert"
                      style={{ marginTop: 'var(--space-sm)', fontSize: '0.75rem', textAlign: 'center' }}
                    >
                      {printStatus.message}
                    </div>
                  )}

                  <button
                    type="button"
                    id="print-qr-button"
                    className="btn btn-success w-full"
                    onClick={handlePrint}
                    disabled={printing}
                    style={{ marginTop: 'var(--space-sm)' }}
                  >
                    {printing ? 'Printing...' : 'Print QR'}
                  </button>

                  <a
                    href={`/admin/file/${generatedFile.fileId}`}
                    className="btn btn-ghost"
                    id="open-created-file"
                    style={{ marginTop: 'var(--space-sm)' }}
                  >
                    Open File Details
                  </a>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', opacity: 0.7 }}>
                  <svg width="84" height="84" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ marginBottom: 'var(--space-lg)', color: 'var(--border)' }}>
                    <rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <rect x="10" y="10" width="12" height="12" rx="1" fill="currentColor" opacity="0.6"/>
                    <rect x="36" y="4" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <rect x="42" y="10" width="12" height="12" rx="1" fill="currentColor" opacity="0.6"/>
                    <rect x="4" y="36" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <rect x="10" y="42" width="12" height="12" rx="1" fill="currentColor" opacity="0.6"/>
                    <rect x="36" y="36" width="6" height="6" rx="1" fill="currentColor" opacity="0.6"/>
                    <rect x="46" y="36" width="6" height="6" rx="1" fill="currentColor" opacity="0.6"/>
                    <rect x="36" y="46" width="6" height="6" rx="1" fill="currentColor" opacity="0.6"/>
                    <rect x="54" y="36" width="6" height="14" rx="1" fill="currentColor" opacity="0.6"/>
                    <rect x="46" y="54" width="14" height="6" rx="1" fill="currentColor" opacity="0.6"/>
                  </svg>
                  <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-wide)' }}>
                    Awaiting Submission
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', maxWidth: 220, marginTop: 'var(--space-sm)' }}>
                    Complete the registration form to generate the encrypted tracking QR code
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
