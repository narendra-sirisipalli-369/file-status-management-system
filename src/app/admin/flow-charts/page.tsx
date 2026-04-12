"use client";

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { STAGES, formatDate, formatDateTime } from '@/lib/qrService';

type StageCount = { stage: string; count: number; color: string };

type FlowFile = {
  id: string;
  fileId: string;
  smsRefNo: string;
  description: string;
  status: string;
  department: string;
  dateSubmission: string;
  histories: Array<{
    stageName: string;
    inspectionBy: string;
    remarks: string;
    timestamp: string;
  }>;
};

const STAGE_COLORS: Record<string, string> = {
  'Inward':           'var(--stage-inward)',
  'D Logo':           'var(--stage-dlogo)',
  'B Logo':           'var(--stage-blogo)',
  'CO Stage':         'var(--stage-co)',
  'Store Office':     'var(--stage-store)',
  'IFA':              'var(--stage-ifa)',
  'Tender Prep':      'var(--stage-tender)',
  'Tender Published': 'var(--neon-green)',
  'Bid Awarded':      'var(--neon-green)',
};

function fmtDateForDisplay(iso: string) {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${m} / ${d} / ${y}`;
}

function parseIsoDate(iso: string) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toIsoDate(date: Date) {
  const yyyy = `${date.getFullYear()}`;
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getMonthMatrix(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < startDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  return { year, month, cells };
}

export default function FlowChartsPage() {
  const [files,     setFiles]     = useState<FlowFile[]>([]);
  const [stage,     setStage]     = useState('');
  const [fromDate,  setFromDate]  = useState('');
  const [toDate,    setToDate]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [now,       setNow]       = useState('');

  const fromRowRef = useRef<HTMLDivElement | null>(null);
  const toRowRef = useRef<HTMLDivElement | null>(null);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [fromMonth, setFromMonth] = useState(() => new Date());
  const [toMonth, setToMonth] = useState(() => new Date());
  const [yearOptions] = useState(() => {
    const nowYear = new Date().getFullYear();
    const start = nowYear - 10;
    return Array.from({ length: 21 }, (_, i) => start + i);
  });

  const togglePicker = (which: 'from' | 'to') => {
    const open = which === 'from' ? fromOpen : toOpen;
    const setOpen = which === 'from' ? setFromOpen : setToOpen;
    setOpen(!open);
  };

  useEffect(() => {
    setNow(new Date().toLocaleString('en-IN'));
  }, []);

  useEffect(() => {
    if (fromOpen) {
      const selected = parseIsoDate(fromDate);
      setFromMonth(selected ?? new Date());
    }
  }, [fromOpen, fromDate]);

  useEffect(() => {
    if (toOpen) {
      const selected = parseIsoDate(toDate);
      setToMonth(selected ?? new Date());
    }
  }, [toOpen, toDate]);

  useEffect(() => {
    if (!fromOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!fromRowRef.current?.contains(event.target as Node)) {
        setFromOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [fromOpen]);

  useEffect(() => {
    if (!toOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!toRowRef.current?.contains(event.target as Node)) {
        setToOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [toOpen]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate)   params.set('to',   toDate);
      const res  = await fetch(`/api/files?${params}`);
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  // Compute counts per stage
  const stageCounts: StageCount[] = STAGES.map(s => ({
    stage: s.key,
    count: files.filter(f => f.status === s.key).length,
    color: STAGE_COLORS[s.key] ?? 'var(--blue-accent)',
  }));

  const maxCount = Math.max(...stageCounts.map(s => s.count), 1);

  const filteredFiles = files.filter(f => !stage || f.status === stage);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      {/* Page Header */}
      <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', background: 'rgba(13,17,23,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Flow Charts
          </h2>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
            Live pipeline view • Updated: {now}
          </div>
        </div>
      </div>

      <div className="container">

        {/* ── FILTER ROW ── */}
        <div className="glass-card mb-lg" style={{ padding: 'var(--space-md)' }}>
          <form
            onSubmit={e => { e.preventDefault(); fetchFiles(); }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 'var(--space-md)', alignItems: 'end' }}
          >
            <div className="input-group">
              <label>From Date</label>
              <div className="date-row" ref={fromRowRef}>
                <input
                  id="flow-from-display"
                  type="text"
                  className="input-field date-field"
                  value={fromDate ? fmtDateForDisplay(fromDate) : ''}
                  placeholder="mm / dd / yyyy"
                  readOnly
                  onClick={() => togglePicker('from')}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      togglePicker('from');
                    }
                  }}
                />
                <button
                  type="button"
                  className="date-toggle"
                  aria-label={fromOpen ? 'Close calendar' : 'Open calendar'}
                  aria-pressed={fromOpen}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => togglePicker('from')}
                >
                  <Calendar size={18} aria-hidden="true" />
                </button>
                {fromOpen && (
                  <div className="calendar-popover" role="dialog" aria-label="Choose From Date">
                    <div className="calendar-header">
                      <button
                        type="button"
                        className="calendar-nav"
                        aria-label="Previous month"
                        onClick={() => setFromMonth(new Date(fromMonth.getFullYear(), fromMonth.getMonth() - 1, 1))}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="calendar-title">
                        {fromMonth.toLocaleString('en-US', { month: 'long' })}
                      </div>
                      <select
                        className="calendar-year"
                        aria-label="Select year"
                        value={fromMonth.getFullYear()}
                        onChange={e => {
                          const year = Number(e.target.value);
                          setFromMonth(new Date(year, fromMonth.getMonth(), 1));
                        }}
                      >
                        {yearOptions.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="calendar-nav"
                        aria-label="Next month"
                        onClick={() => setFromMonth(new Date(fromMonth.getFullYear(), fromMonth.getMonth() + 1, 1))}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <div className="calendar-week">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                    <div className="calendar-grid">
                      {getMonthMatrix(fromMonth).cells.map((day, idx) => {
                        if (!day) return <span key={`ff-${idx}`} className="calendar-day is-empty" />;
                        const date = new Date(fromMonth.getFullYear(), fromMonth.getMonth(), day);
                        const iso = toIsoDate(date);
                        const selected = iso === fromDate;
                        return (
                          <button
                            type="button"
                            key={`ff-${idx}`}
                            className={`calendar-day${selected ? ' is-selected' : ''}`}
                            onClick={() => {
                              setFromDate(iso);
                              setFromOpen(false);
                            }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="input-group">
              <label>To Date</label>
              <div className="date-row" ref={toRowRef}>
                <input
                  id="flow-to-display"
                  type="text"
                  className="input-field date-field"
                  value={toDate ? fmtDateForDisplay(toDate) : ''}
                  placeholder="mm / dd / yyyy"
                  readOnly
                  onClick={() => togglePicker('to')}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      togglePicker('to');
                    }
                  }}
                />
                <button
                  type="button"
                  className="date-toggle"
                  aria-label={toOpen ? 'Close calendar' : 'Open calendar'}
                  aria-pressed={toOpen}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => togglePicker('to')}
                >
                  <Calendar size={18} aria-hidden="true" />
                </button>
                {toOpen && (
                  <div className="calendar-popover" role="dialog" aria-label="Choose To Date">
                    <div className="calendar-header">
                      <button
                        type="button"
                        className="calendar-nav"
                        aria-label="Previous month"
                        onClick={() => setToMonth(new Date(toMonth.getFullYear(), toMonth.getMonth() - 1, 1))}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="calendar-title">
                        {toMonth.toLocaleString('en-US', { month: 'long' })}
                      </div>
                      <select
                        className="calendar-year"
                        aria-label="Select year"
                        value={toMonth.getFullYear()}
                        onChange={e => {
                          const year = Number(e.target.value);
                          setToMonth(new Date(year, toMonth.getMonth(), 1));
                        }}
                      >
                        {yearOptions.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="calendar-nav"
                        aria-label="Next month"
                        onClick={() => setToMonth(new Date(toMonth.getFullYear(), toMonth.getMonth() + 1, 1))}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <div className="calendar-week">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                    <div className="calendar-grid">
                      {getMonthMatrix(toMonth).cells.map((day, idx) => {
                        if (!day) return <span key={`ft-${idx}`} className="calendar-day is-empty" />;
                        const date = new Date(toMonth.getFullYear(), toMonth.getMonth(), day);
                        const iso = toIsoDate(date);
                        const selected = iso === toDate;
                        return (
                          <button
                            type="button"
                            key={`ft-${idx}`}
                            className={`calendar-day${selected ? ' is-selected' : ''}`}
                            onClick={() => {
                              setToDate(iso);
                              setToOpen(false);
                            }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="input-group">
              <label>Filter by Stage</label>
              <select className="input-field" value={stage} onChange={e => setStage(e.target.value)}>
                <option value="">All Stages</option>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Wait' : 'Apply Filter'}
            </button>
          </form>
        </div>

        {/* ── PIPELINE FUNNEL (SVG) ── */}
        <div className="glass-card mb-lg">
          <div className="section-title mb-lg">Pipeline Distribution</div>
          <div style={{ overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${STAGES.length * 100} 160`}
              width="100%"
              style={{ minWidth: 700, display: 'block' }}
            >
              {stageCounts.map((sc, idx) => {
                const x      = idx * 100 + 10;
                const barH   = maxCount > 0 ? (sc.count / maxCount) * 100 : 0;
                const barY   = 110 - barH;
                const isActive = sc.stage === stage;

                return (
                  <g key={sc.stage} style={{ cursor: 'pointer' }} onClick={() => setStage(sc.stage === stage ? '' : sc.stage)}>
                    {/* Bar */}
                    <rect
                      x={x + 15} y={barY} width={50} height={barH}
                      rx={4}
                      fill={sc.color}
                      opacity={isActive ? 1 : 0.55}
                      style={{ transition: 'all 0.4s' }}
                    />
                    {/* Filter glow overlay */}
                    {isActive && (
                      <rect x={x + 14} y={barY - 1} width={52} height={barH + 2} rx={4}
                        fill="none" stroke={sc.color} strokeWidth={2} opacity={0.8} />
                    )}
                    {/* Count label */}
                    {sc.count > 0 && (
                      <text
                        x={x + 40} y={barY - 5}
                        textAnchor="middle" fontSize={10} fontWeight="700"
                        fill={sc.color} fontFamily="sans-serif"
                      >
                        {sc.count}
                      </text>
                    )}
                    {/* Stage short label */}
                    <text
                      x={x + 40} y={125}
                      textAnchor="middle" fontSize={7.5} fontWeight="600"
                      fill={isActive ? sc.color : '#484f58'} fontFamily="sans-serif"
                    >
                      {STAGES[idx].short}
                    </text>
                    {/* Full label on hover — static below */}
                    <text
                      x={x + 40} y={140}
                      textAnchor="middle" fontSize={6.5}
                      fill={isActive ? sc.color : '#333d47'} fontFamily="sans-serif"
                    >
                      {STAGES[idx].label.length > 10 ? STAGES[idx].label.slice(0, 9) + '...' : STAGES[idx].label}
                    </text>

                    {/* Connector arrow */}
                    {idx < STAGES.length - 1 && (
                      <text x={x + 82} y={70} fontSize={12} fill="#242a34" fontFamily="sans-serif">-</text>
                    )}
                  </g>
                );
              })}
              {/* Baseline */}
              <line x1={10} y1={111} x2={STAGES.length * 100 - 10} y2={111} stroke="var(--border)" strokeWidth={1} />
            </svg>
          </div>
          {stage && (
            <div style={{ marginTop: 'var(--space-sm)', fontSize: '0.75rem', color: STAGE_COLORS[stage] }}>
              Showing files at stage: <strong>{stage}</strong> - click the bar again to clear filter.
            </div>
          )}
        </div>

        {/* ── FILE FLOW TABLE ── */}
        <div className="glass-card" style={{ padding: 0 }}>
          <div style={{
            padding: 'var(--space-md) var(--space-lg)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div className="section-title">
              {stage ? `Files at: ${stage}` : 'All Files: Timeline View'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 'var(--space-lg)' }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-row" style={{ marginBottom: 1 }} />)}
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
                    <th>Submitted</th>
                    <th>Current Stage</th>
                    <th>History</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        {stage ? `No files currently at "${stage}" stage.` : 'No files found.'}
                      </td>
                    </tr>
                  )}
                  {filteredFiles.map((f, i) => {
                    const color = STAGE_COLORS[f.status] ?? 'var(--blue-accent)';
                    return (
                      <tr key={f.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{i + 1}</td>
                        <td>
                          <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--blue-accent)' }}>
                            {f.smsRefNo}
                          </span>
                        </td>
                        <td className="truncate" style={{ maxWidth: 200 }}>{f.description}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{f.department}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {formatDate(f.dateSubmission)}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: '0.7rem', fontWeight: 700,
                            padding: '3px 8px', borderRadius: 20,
                            background: `${color}18`,
                            color, border: `1px solid ${color}44`,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 6px ${color}` }} />
                            {f.status}
                          </span>
                        </td>
                        <td>
                          {/* Mini pipeline dots */}
                          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                            {STAGES.map((s, si) => {
                              const done   = f.histories.some(h => h.stageName === s.key);
                              const active = f.status === s.key;
                              return (
                                <div
                                  key={si}
                                  title={s.label}
                                  style={{
                                    width: 7, height: 7, borderRadius: '50%',
                                    background: active ? s.color : done ? '#39ff1466' : 'var(--border)',
                                    boxShadow: active ? `0 0 5px ${s.color}` : 'none',
                                    flexShrink: 0,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </td>
                        <td>
                          <a href={`/admin/file/${f.fileId}`} className="btn btn-ghost" style={{ padding: '0.3rem 0.7rem', fontSize: '0.65rem' }}>
                            Open
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
