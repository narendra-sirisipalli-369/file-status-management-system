import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';

function fmtINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getStatusColor(status: string): string {
  if (['Tender Published', 'Bid Awarded'].includes(status)) return '#1a7a09';
  if (status === 'Inward')                                   return '#000080';
  if (['CO Stage', 'Tender Prep'].includes(status))         return '#cc0000';
  return '#8b5e00';
}

async function MetricsPanel({ query }: { query: string }) {
  const where = query ? {
    OR: [
      { secureTrackingId: { contains: query } },
      { smsRefNo:          { contains: query } },
      { description:       { contains: query } },
    ],
  } : undefined;

  const files = await prisma.fileRecord.findMany({ where, select: { status: true } });
  
  // KPIs per Admin_flow.pdf specification
  const initiated = files.length;
  const notInitiated = files.filter(f => f.status === 'Inward').length;
  const withMailman = files.filter(f => f.status === 'Mailman').length;
  const pendingApprovals = files.filter(f => ['CO Stage', 'IFA'].includes(f.status)).length;

  const recentHistory = await prisma.statusHistory.findMany({
    take: 5,
    orderBy: { timestamp: 'desc' },
    include: { fileRecord: { select: { smsRefNo: true } } }
  });

  return (
    <div>
      <div className="metrics-grid" style={{ marginBottom: 'var(--space-xl)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
        {[
          { label: 'Files Initiated', value: initiated,        sub: 'Total registered files', color: 'var(--navy)' },
          { label: 'Not Initiated',   value: notInitiated,     sub: 'At Inward stage',        color: 'var(--stage-inward)' },
          { label: 'With Mailman',    value: withMailman,      sub: 'In transit',             color: 'var(--gold)' },
          { label: 'Pending Approvals',value:pendingApprovals, sub: 'CO Stage / IFA',         color: 'var(--danger)' },
        ].map(m => (
          <div className="metric-card glass-panel" key={m.label} style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: m.color }} />
            <div className="metric-label" style={{ letterSpacing: 'var(--letter-spacing-tech)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{m.label}</div>
            <div className="metric-value" style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--navy)', margin: '0.5rem 0' }}>{String(m.value).padStart(3, '0')}</div>
            <div className="metric-sub" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{query ? `Matching "${query}"` : m.sub}</div>
          </div>
        ))}
      </div>

      <div className="section-title" style={{ marginBottom: 'var(--space-md)' }}>Recent Activities</div>
      <div style={{ position: 'relative', background: 'var(--bg-white)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-md)', boxShadow: 'var(--elevate-1)' }}>
        {recentHistory.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '2rem' }}>No recent activity.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {recentHistory.map((h, i) => (
              <div key={h.id} style={{ display: 'flex', gap: '1.25rem', position: 'relative', paddingBottom: '1.5rem' }}>
                {/* Timeline Line */}
                {i < recentHistory.length - 1 && (
                  <div style={{ position: 'absolute', left: 15, top: 32, bottom: 0, width: '2px', background: 'var(--border)' }} />
                )}
                <div style={{ flexShrink: 0, width: 32, height: 32, background: 'var(--navy)', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, zIndex: 1, boxShadow: '0 0 0 4px #fff' }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, paddingTop: '0.2rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', letterSpacing: 'var(--letter-spacing-tech)' }}>
                    {h.fileRecord.smsRefNo}
                    <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)', fontWeight: 400 }}>→</span>
                    <span style={{ color: 'var(--gold)' }}>{h.stageName}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', marginTop: '0.25rem', lineHeight: 1.4 }}>{h.remarks}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {fmtDate(h.timestamp)} • INSPECTED BY: {h.inspectionBy}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function FilesTable({ query }: { query: string }) {
  const where = query ? {
    OR: [
      { secureTrackingId: { contains: query } },
      { smsRefNo:          { contains: query } },
      { description:       { contains: query } },
    ],
  } : undefined;

  const files = await prisma.fileRecord.findMany({
    where,
    include: { histories: { orderBy: { timestamp: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="table-wrap">
      <table className="data-table" aria-label="All Files">
        <thead>
          <tr>
            <th>#</th>
            <th>IND-CV Tracking ID</th>
            <th>Description</th>
            <th>Value (INR)</th>
            <th>Stage</th>
            <th>Submitted</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {files.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                {query ? `No files match "${query}".` : 'No files registered yet.'}
              </td>
            </tr>
          )}
          {files.map((f, i) => (
            <tr key={f.id} style={{ transition: 'var(--transition)' }}>
              <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center', fontSize: '0.65rem' }}>{String(i + 1).padStart(2, '0')}</td>
              <td>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--navy)', fontWeight: 700, letterSpacing: '0.02em' }}>
                  {f.secureTrackingId}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.1rem' }}>REF: {f.smsRefNo}</div>
              </td>
              <td style={{ maxWidth: 220 }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{f.description}</div>
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600 }}>{fmtINR(f.proposalValue)}</td>
              <td>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  background: `${getStatusColor(f.status)}12`,
                  borderLeft: `3px solid ${getStatusColor(f.status)}`,
                  color: getStatusColor(f.status),
                  borderRadius: '2px',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  {f.status}
                </span>
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {fmtDate(f.dateSubmission)}
              </td>
              <td>
                <a href={`/admin/file/${f.secureTrackingId}`} className="row-btn" style={{ width: 'auto', fontSize: '0.6rem', padding: '0 0.75rem' }}>
                  Open
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="metrics-grid">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="metric-card" style={{ minHeight: 100 }}>
          <div className="skeleton" style={{ height: 10, width: 80, borderRadius: 4, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 36, width: 60, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = (searchParams.q ?? '').trim();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Real-time file pipeline overview</div>
        </div>
        <a href="/admin/file-entry" className="btn btn-primary" id="dashboard-new-file">New File Entry</a>
      </div>

      <div className="container">
        {/* Search bar */}
        <form action="/admin/dashboard" method="GET" style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{
            display: 'flex', gap: 'var(--space-sm)',
            background: 'var(--bg-white)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '0.4rem',
          }}>
            <input
              name="q"
              type="text"
              defaultValue={query}
              placeholder="Search by ID, Ref No, or Description"
              style={{
                flex: 1, padding: '0.5rem 0.75rem',
                background: 'transparent', border: 'none',
                color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem', outline: 'none',
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ minHeight: 40, fontSize: '0.68rem' }}>Search</button>
            {query && (
              <a href="/admin/dashboard" className="btn btn-ghost" style={{ minHeight: 40, fontSize: '0.68rem' }}>Clear</a>
            )}
          </div>
        </form>

        <Suspense fallback={<MetricsSkeleton />}>
          <MetricsPanel query={query} />
        </Suspense>

        <Suspense key={query} fallback={
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading files...</div>
        }>
          <FilesTable query={query} />
        </Suspense>
      </div>
    </div>
  );
}
