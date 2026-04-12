"use client";

import { useEffect, useState } from 'react';
import { statusToBadge, formatDate, formatINR, STAGES } from '@/lib/qrService';

type FileRecord = {
  id: string;
  fileId: string;
  secureTrackingId: string;
  smsRefNo: string;
  description: string;
  proposalValue: number;
  head: string;
  department: string;
  typeProcessing: string;
  status: string;
  dateSubmission: string;
  createdAt: string;
  updatedAt: string;
  histories: Array<{
    id: string;
    stageName: string;
    inspectionBy: string;
    remarks: string;
    timestamp: string;
  }>;
};

type Metrics = {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  stageBreakdown: Record<string, number>;
  deptBreakdown: Record<string, number>;
  processingBreakdown: Record<string, number>;
};

function computeMetrics(files: FileRecord[]): Metrics {
  const stageBreakdown: Record<string, number> = {};
  const deptBreakdown: Record<string, number>  = {};
  const processingBreakdown: Record<string, number> = {};

  for (const f of files) {
    stageBreakdown[f.status]          = (stageBreakdown[f.status] ?? 0) + 1;
    deptBreakdown[f.department]       = (deptBreakdown[f.department] ?? 0) + 1;
    processingBreakdown[f.typeProcessing] = (processingBreakdown[f.typeProcessing] ?? 0) + 1;
  }

  const completed  = files.filter(f => ['Tender Published', 'Bid Awarded'].includes(f.status)).length;
  const pending    = files.filter(f => f.status === 'Inward').length;
  const inProgress = files.length - completed - pending;

  return { total: files.length, completed, pending, inProgress, stageBreakdown, deptBreakdown, processingBreakdown };
}

// Horizontal Bar row
function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'flex-end' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-tech)', color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--navy)' }}>
          {value}
        </span>
      </div>
      <div style={{ height: 8, background: 'var(--bg-light)', borderRadius: 4, overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            borderRadius: 4,
            transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
            boxShadow: `0 0 12px ${color}44`,
          }}
        />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [files, setFiles]     = useState<FileRecord[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');
  const [dept, setDept]         = useState('');
  const [departments, setDepartments] = useState<string[]>([]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate)   params.set('to',   toDate);
      if (dept)     params.set('dept', dept);
      const res  = await fetch(`/api/files?${params}`);
      const data: FileRecord[] = await res.json();
      if (Array.isArray(data)) {
        setFiles(data);
        setMetrics(computeMetrics(data));
        const depts = Array.from(new Set(data.map((f: any) => f.department)));
        setDepartments(depts);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const maxStage = metrics ? Math.max(...Object.values(metrics.stageBreakdown), 1) : 1;
  const maxDept  = metrics ? Math.max(...Object.values(metrics.deptBreakdown), 1) : 1;

  // Color per stage
  const stageColors: Record<string, string> = {
    'Inward': 'var(--stage-inward)', 'D Logo': 'var(--stage-dlogo)', 'B Logo': 'var(--stage-blogo)',
    'CO Stage': 'var(--stage-co)', 'Store Office': 'var(--stage-store)', 'IFA': 'var(--stage-ifa)',
    'Tender Prep': 'var(--stage-tender)', 'Tender Published': 'var(--neon-green)', 'Bid Awarded': 'var(--neon-green)',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      {/* Handled by AdminLayout, but Reports has its own layout sometimes. 
          Actually, Reports is inside AdminLayout usually. Let's check layout.tsx.
          If it's already in the layout, we don't need the nav here. 
          Looking at the code, ReportsPage is a full page.
      */}
      
      <div className="page-header">
        <div>
          <div className="page-title">Reports & Analytics</div>
          <div className="page-sub">Comprehensive pipeline performance data</div>
        </div>
      </div>

      <div className="container">

        {/* ── FILTER BAR ── */}
        <div className="glass-panel mb-lg" style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-lg)' }}>
          <form
            onSubmit={e => { e.preventDefault(); fetchReports(); }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) auto', gap: 'var(--space-md)', alignItems: 'end' }}
          >
            <div className="input-group">
              <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>From Date</label>
              <input type="date" className="input-field" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', width: '100%' }} />
            </div>
            <div className="input-group">
              <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>To Date</label>
              <input type="date" className="input-field" value={toDate} onChange={e => setToDate(e.target.value)} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', width: '100%' }} />
            </div>
            <div className="input-group">
              <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Department</label>
              <select className="input-field" value={dept} onChange={e => setDept(e.target.value)} style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', width: '100%' }}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minHeight: 40 }}>
              {loading ? 'Processing...' : 'Generate Report'}
            </button>
          </form>

          {/* ── CSV Export ── */}
          <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 'var(--letter-spacing-tech)' }}>
              Audit Export
            </span>
            <a
              id="csv-export-btn"
              href={`/api/files/export?${new URLSearchParams(
                Object.fromEntries(
                  Object.entries({ from: fromDate, to: toDate, dept }).filter(([, v]) => v !== '')
                )
              )}`}
              download
              style={{
                display:         'inline-flex',
                alignItems:      'center',
                gap:             '0.5rem',
                minHeight:       '48px',
                padding:         '0 1.5rem',
                backgroundColor: '#000080',
                color:           '#FFFFFF',
                border:          'none',
                borderRadius:    '4px',
                fontSize:        '0.72rem',
                fontWeight:      700,
                letterSpacing:   '0.08em',
                textTransform:   'uppercase',
                textDecoration:  'none',
                cursor:          'pointer',
                fontFamily:      'inherit',
              }}
            >
              ↓ Download Audit Log (CSV)
            </a>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              Exports all files &amp; complete status history — formatted for physical printing
            </span>
          </div>
        </div>

        {/* ── SUMMARY METRICS ── */}
        {metrics && (
          <div className="metrics-grid mb-lg" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
            {[
              { label: 'Total Files', value: metrics.total, sub: 'All registered files', color: 'var(--navy)' },
              { label: 'Completed', value: metrics.completed, sub: 'Tender Published / Awarded', color: 'var(--success)' },
              { label: 'In Progress', value: metrics.inProgress, sub: 'Active pipeline stages', color: 'var(--gold)' },
              { label: 'At Inward', value: metrics.pending, sub: 'Awaiting first action', color: 'var(--stage-inward)' },
            ].map(m => (
              <div className="metric-card glass-panel" key={m.label} style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: m.color }} />
                <div className="metric-label" style={{ letterSpacing: 'var(--letter-spacing-tech)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{m.label}</div>
                <div className="metric-value" style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--navy)', margin: '0.5rem 0' }}>{String(m.value).padStart(3, '0')}</div>
                <div className="metric-sub" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{m.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── CHARTS ROW ── */}
        {metrics && (
          <div className="grid-2 mb-lg" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>

            {/* Stage Breakdown Chart */}
            <div className="glass-panel" style={{ padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
              <div className="section-title mb-lg" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-wide)', color: 'var(--navy)' }}>Pipeline Distribution</div>
              {STAGES.map(s => (
                <HBar
                  key={s.key}
                  label={s.label}
                  value={metrics.stageBreakdown[s.key] ?? 0}
                  max={maxStage}
                  color={stageColors[s.key] ?? 'var(--navy)'}
                />
              ))}
            </div>

            {/* Dept + Processing Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="glass-panel" style={{ padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
                <div className="section-title mb-lg" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-wide)', color: 'var(--navy)' }}>Departmental Load</div>
                {Object.entries(metrics.deptBreakdown).length === 0
                  ? <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No data</div>
                  : Object.entries(metrics.deptBreakdown).map(([d, v]) => (
                    <HBar key={d} label={d} value={v} max={maxDept} color="var(--navy)" />
                  ))
                }
              </div>

              <div className="glass-panel" style={{ padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
                <div className="section-title mb-lg" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-wide)', color: 'var(--navy)' }}>Processing Architecture</div>
                {/* Horizontal Donut-style breakdown */}
                {Object.entries(metrics.processingBreakdown).map(([type, count]) => {
                  const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginBottom: '1rem' }}>
                      {/* Mini donut */}
                      <svg width="48" height="48" viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
                        <circle cx="20" cy="20" r="16" fill="none" stroke="var(--bg-light)" strokeWidth="6" />
                        <circle
                          cx="20" cy="20" r="16"
                          fill="none"
                          stroke="var(--gold)"
                          strokeWidth="6"
                          strokeDasharray={`${(pct / 100) * 100.5} 100.5`}
                          strokeLinecap="round"
                          transform="rotate(-90 20 20)"
                        />
                        <text x="20" y="24" textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--navy)" fontFamily="sans-serif">
                          {pct}%
                        </text>
                      </svg>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--navy)', letterSpacing: 'var(--letter-spacing-tech)' }}>{type}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{count} file{count !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── FULL FILE TABLE ── */}
        <div className="glass-card" style={{ padding: 0 }}>
          <div style={{ padding: 'var(--space-lg) var(--space-lg) var(--space-md)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-title">Full File Register</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {files.length} records
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 'var(--space-lg)' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton skeleton-row" style={{ marginBottom: 1 }} />
              ))}
            </div>
          ) : (
            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ref No</th>
                    <th>Description</th>
                    <th>Dept</th>
                    <th>Type</th>
                    <th>Value (INR)</th>
                    <th>Submitted</th>
                    <th>Stage</th>
                    <th>Last Action</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {files.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No files found for selected filters.
                      </td>
                    </tr>
                  )}
                  {files.map((f, i) => (
                    <tr key={f.id} style={{ transition: 'var(--transition)' }}>
                      <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>{String(i + 1).padStart(2, '0')}</td>
                      <td>
                        <span style={{ fontSize: '0.72rem', color: 'var(--navy)', fontWeight: 700, letterSpacing: '0.02em', fontFamily: 'var(--font-mono)' }}>
                          {f.smsRefNo}
                        </span>
                      </td>
                      <td style={{ maxWidth: 200 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.description}</div>
                      </td>
                      <td style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>{f.department}</td>
                      <td>
                        <span style={{ fontSize: '0.62rem', padding: '3px 8px', background: 'var(--bg-light)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 2, fontWeight: 700, textTransform: 'uppercase' }}>
                          {f.typeProcessing}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600 }}>
                        {formatINR(f.proposalValue)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {formatDate(f.dateSubmission)}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 10px',
                          background: `${stageColors[f.status] ?? 'var(--navy)'}12`,
                          borderLeft: `3px solid ${stageColors[f.status] ?? 'var(--navy)'}`,
                          color: stageColors[f.status] ?? 'var(--navy)',
                          borderRadius: '2px',
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}>
                          {f.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.histories[0]
                          ? `${f.histories[0].inspectionBy}: ${f.histories[0].remarks}`
                          : '-'}
                      </td>
                      <td>
                        <a
                          href={`/admin/file/${f.secureTrackingId}`}
                          className="row-btn"
                          style={{ width: 'auto', fontSize: '0.6rem', padding: '0 0.75rem' }}
                        >
                          Open
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
