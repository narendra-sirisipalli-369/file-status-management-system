'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';

type Lookup = { id: string; name: string };
type HeadCode = { id: string; code: string; name: string };
type Stage = { id: string; name: string };

type ReportRow = {
  fileRecordId: string;
  smsRefNo: string;
  description: string;
  proposalValue: string;
  departmentName: string;
  headCodeCode: string;
  headCodeName: string;
  procurementModeName: string;
  authorityName: string;
  fileEnteredAt: string;
  stageName: string;
  sequenceOrder: number;
  enteredAt: string | null;
  exitedAt: string | null;
  action: 'Complete' | 'Skipped' | 'In progress' | 'Pending';
};

const EMPTY = '';

function fmtDateTime(v: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
function fmtINR(v: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v));
}

export default function ReportsPage() {
  const [departments, setDepartments] = useState<Lookup[]>([]);
  const [procurementModes, setProcurementModes] = useState<Lookup[]>([]);
  const [authorities, setAuthorities] = useState<Lookup[]>([]);
  const [headCodes, setHeadCodes] = useState<HeadCode[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

  const [filters, setFilters] = useState({
    q: EMPTY, departmentId: EMPTY, procurementModeId: EMPTY, authorityId: EMPTY,
    headCodeId: EMPTY, stageId: EMPTY, from: EMPTY, to: EMPTY,
  });

  const [rows, setRows] = useState<ReportRow[]>([]);
  const { page, setPage, totalPages, pageItems: pagedRows } = usePagination(rows);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/departments').then((r) => r.json()),
      fetch('/api/procurement-modes').then((r) => r.json()),
      fetch('/api/authorities').then((r) => r.json()),
      fetch('/api/head-codes').then((r) => r.json()),
      fetch('/api/stages?activeOnly=false').then((r) => r.json()),
    ]).then(([d, pm, a, hc, s]) => {
      setDepartments(d);
      setProcurementModes(pm);
      setAuthorities(a);
      setHeadCodes(hc);
      setStages(s);
    });
  }, []);

  function buildQuery(): string {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
    return p.toString();
  }

  // Auto-applies on load and on every filter change — no "Apply Filters"
  // button. Debounced so typing in Search doesn't fire a request per keystroke.
  useEffect(() => {
    setLoading(true);
    setError('');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/reports?${buildQuery()}`);
        if (!res.ok) {
          setError('Failed to load report.');
          return;
        }
        setRows(await res.json());
      } catch {
        setError('Network error.');
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const downloadHref = (format: 'xlsx' | 'pdf' | 'docx') => `/api/reports/export?format=${format}&${buildQuery()}`;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <PageHeader title="Reports" subtitle="Filters apply automatically — download as Excel, PDF, or Word below." />

      <div className="container">
        <div
          className="card"
          style={{
            marginBottom: 'var(--space-lg)', display: 'flex', flexWrap: 'wrap',
            alignItems: 'flex-end', gap: 'var(--space-sm)', padding: 'var(--space-md)',
          }}
        >
          <div className="input-group" style={{ flex: '1 1 200px', minWidth: 160, margin: 0 }}>
            <label>Search</label>
            <input className="input-field" value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))} placeholder="Description / ref / tracking ID" />
          </div>
          <div className="input-group" style={{ flex: '1 1 150px', minWidth: 140, margin: 0 }}>
            <label>Department</label>
            <select className="input-field" value={filters.departmentId} onChange={(e) => setFilters((p) => ({ ...p, departmentId: e.target.value }))}>
              <option value={EMPTY}>All departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ flex: '1 1 150px', minWidth: 140, margin: 0 }}>
            <label>Mode</label>
            <select className="input-field" value={filters.procurementModeId} onChange={(e) => setFilters((p) => ({ ...p, procurementModeId: e.target.value }))}>
              <option value={EMPTY}>All modes</option>
              {procurementModes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ flex: '1 1 150px', minWidth: 140, margin: 0 }}>
            <label>Authority</label>
            <select className="input-field" value={filters.authorityId} onChange={(e) => setFilters((p) => ({ ...p, authorityId: e.target.value }))}>
              <option value={EMPTY}>All authorities</option>
              {authorities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ flex: '1 1 150px', minWidth: 140, margin: 0 }}>
            <label>Head Code</label>
            <select className="input-field" value={filters.headCodeId} onChange={(e) => setFilters((p) => ({ ...p, headCodeId: e.target.value }))}>
              <option value={EMPTY}>All head codes</option>
              {headCodes.map((h) => <option key={h.id} value={h.id}>{h.code} — {h.name}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ flex: '1 1 150px', minWidth: 140, margin: 0 }}>
            <label>Stage</label>
            <select className="input-field" value={filters.stageId} onChange={(e) => setFilters((p) => ({ ...p, stageId: e.target.value }))}>
              <option value={EMPTY}>All stages</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ flex: '1 1 130px', minWidth: 130, margin: 0 }}>
            <label>From</label>
            <input type="date" className="input-field" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} />
          </div>
          <div className="input-group" style={{ flex: '1 1 130px', minWidth: 130, margin: 0 }}>
            <label>To</label>
            <input type="date" className="input-field" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} />
          </div>
          {loading && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flex: '0 0 auto', paddingBottom: '0.6rem' }}>Searching...</span>}
        </div>

        {error && <div className="alert alert-error mb-lg">{error}</div>}

        <div className="card">
          <div className="card-header">
            Results
            <span style={{ float: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              {rows.length} row{rows.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <a className="btn btn-secondary btn-sm" href={downloadHref('xlsx')}>Download Excel</a>
            <a className="btn btn-secondary btn-sm" href={downloadHref('pdf')}>Download PDF</a>
            <a className="btn btn-secondary btn-sm" href={downloadHref('docx')}>Download Word</a>
          </div>

          <div className="table-wrap" style={{ marginTop: 0 }}>
            <table className="data-table compact" aria-label="Report Preview">
              <thead>
                <tr>
                  <th>Case Description</th>
                  <th>Proposal Value</th>
                  <th>Department</th>
                  <th>Head Code</th>
                  <th>Mode</th>
                  <th>Authority</th>
                  <th>File Entered</th>
                  <th>Stage</th>
                  <th>Entered</th>
                  <th>Exited</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No matching rows.</td></tr>
                )}
                {!loading && pagedRows.map((r) => (
                  <tr key={`${r.fileRecordId}-${r.sequenceOrder}`}>
                    <td className="preserve-case" style={{ maxWidth: 220 }}>{r.description}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{fmtINR(r.proposalValue)}</td>
                    <td>{r.departmentName}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.headCodeCode} — {r.headCodeName}</td>
                    <td>{r.procurementModeName}</td>
                    <td>{r.authorityName}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{fmtDateTime(r.fileEnteredAt)}</td>
                    <td>{r.stageName}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{fmtDateTime(r.enteredAt)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{fmtDateTime(r.exitedAt)}</td>
                    <td>{r.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
