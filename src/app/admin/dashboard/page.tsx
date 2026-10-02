import { Suspense } from 'react';
import { Search } from 'lucide-react';
import { listFileRecords } from '@/lib/repositories/fileRecords';
import { statusToBadge } from '@/lib/qrService';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { getSessionUser } from '@/lib/session';

function fmtINR(v: number | string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v));
}
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const PAGE_SIZE = 10;

function pageWindow(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = Array.from(new Set([1, totalPages, page, page - 1, page + 1])).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | '…')[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) result.push('…');
    result.push(p);
  });
  return result;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#000080',
  IN_PROGRESS: '#8b5e00',
  ON_HOLD: '#8b5e00',
  COMPLETED: '#1a7a09',
  CANCELLED: '#cc0000',
  REJECTED: '#cc0000',
};

async function MetricsPanel({ query }: { query: string }) {
  const files = await listFileRecords({ q: query || undefined });

  const initiated = files.length;
  const inProgress = files.filter((f) => f.status === 'IN_PROGRESS').length;
  const completed = files.filter((f) => f.status === 'COMPLETED').length;
  const needsAttention = files.filter((f) => ['ON_HOLD', 'CANCELLED', 'REJECTED'].includes(f.status)).length;

  const authorityBreakdown: Record<string, number> = {};
  for (const f of files) {
    authorityBreakdown[f.authorityName] = (authorityBreakdown[f.authorityName] ?? 0) + 1;
  }
  const authorityEntries = Object.entries(authorityBreakdown).sort((a, b) => b[1] - a[1]);
  const maxAuthorityCount = Math.max(...authorityEntries.map(([, c]) => c), 1);

  return (
    <div>
      <div className="metrics-grid" style={{ marginBottom: 'var(--space-xl)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
        {[
          { label: 'Total Files', value: initiated, sub: 'Total registered files', color: 'var(--navy)' },
          { label: 'In Progress', value: inProgress, sub: 'Moving through stages', color: 'var(--gold)' },
          { label: 'Completed', value: completed, sub: 'All stages exited', color: '#1a7a09' },
          { label: 'Needs Attention', value: needsAttention, sub: 'On hold / cancelled / rejected', color: 'var(--danger)' },
        ].map((m) => (
          <div className="metric-card glass-panel" key={m.label} style={{ position: 'relative', overflow: 'hidden', transition: 'var(--transition)' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: m.color }} />
            <div className="metric-label" style={{ letterSpacing: 'var(--letter-spacing-tech)', fontWeight: 700, fontSize: 'var(--fs-caption)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{m.label}</div>
            <div className="metric-value" style={{ fontSize: 'var(--fs-display)', fontWeight: 800, color: 'var(--navy)', margin: '0.5rem 0', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{String(m.value).padStart(3, '0')}</div>
            <div className="metric-sub" style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-secondary)' }}>{query ? `Matching "${query}"` : m.sub}</div>
          </div>
        ))}
      </div>

      <div className="section-title" style={{ marginBottom: 'var(--space-md)' }}>Files by Authority</div>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', boxShadow: 'var(--elevate-1)' }}>
        {authorityEntries.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '2rem' }}>No files yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
            {authorityEntries.map(([name, count]) => {
              const pct = Math.round((count / maxAuthorityCount) * 100);
              return (
                <div key={name} style={{ position: 'relative', padding: '0.7rem 0.9rem', background: 'var(--bg-light)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'var(--navy-faint)', transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} aria-hidden="true" />
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

async function FilesTable({ query, page: pageParam }: { query: string; page?: string }) {
  const allFiles = await listFileRecords({ q: query || undefined });
  const totalPages = Math.max(1, Math.ceil(allFiles.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, parseInt(pageParam ?? '1', 10) || 1), totalPages);
  const files = allFiles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    params.set('page', String(p));
    return `/admin/dashboard?${params.toString()}`;
  };

  return (
    <div>
      <div className="table-wrap">
      <table className="data-table" aria-label="All Files">
        <thead>
          <tr>
            <th>#</th>
            <th>IND-CV Tracking ID</th>
            <th>Description</th>
            <th>Value (INR)</th>
            <th>Status</th>
            <th>Current Stage</th>
            <th>Submitted</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {allFiles.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                {query ? `No files match "${query}".` : 'No files registered yet.'}
              </td>
            </tr>
          )}
          {files.map((f, i) => {
            const color = STATUS_COLORS[f.status] ?? 'var(--navy)';
            return (
              <tr key={f.id} style={{ transition: 'var(--transition)' }}>
                <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center', fontSize: '0.65rem' }}>{String((page - 1) * PAGE_SIZE + i + 1).padStart(2, '0')}</td>
                <td>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--navy)', fontWeight: 700, letterSpacing: '0.02em' }}>{f.secureTrackingId}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.1rem' }}>REF: {f.smsRefNo}</div>
                </td>
                <td style={{ maxWidth: 220 }}>
                  <div className="preserve-case" style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{f.description}</div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtINR(f.proposalValue)}</td>
                <td>
                  <span className={`badge ${statusToBadge(f.status)}`} style={{ borderLeft: `3px solid ${color}` }}>{f.status}</span>
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{f.currentStageName ?? 'Completed'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(f.dateSubmission)}</td>
                <td>
                  <a href={`/admin/file/${f.secureTrackingId}`} className="row-btn" style={{ width: 'auto', fontSize: '0.6rem', padding: '0 0.75rem' }}>Open</a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <a href={pageHref(page - 1)} className="btn btn-ghost btn-sm" style={page === 1 ? { pointerEvents: 'none', opacity: 0.4 } : undefined}>Prev</a>
          {pageWindow(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>…</span>
            ) : (
              <a key={p} href={pageHref(p)} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`} style={{ minWidth: 36, textAlign: 'center' }} aria-current={p === page ? 'page' : undefined}>{p}</a>
            )
          )}
          <a href={pageHref(page + 1)} className="btn btn-ghost btn-sm" style={page === totalPages ? { pointerEvents: 'none', opacity: 0.4 } : undefined}>Next</a>
        </div>
      )}
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="metrics-grid">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="metric-card" style={{ minHeight: 100 }}>
          <div className="skeleton" style={{ height: 10, width: 80, borderRadius: 0, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 36, width: 60, borderRadius: 0 }} />
        </div>
      ))}
    </div>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const query = (searchParams.q ?? '').trim();
  const user = await getSessionUser();
  const greeting = user ? `WELCOME, ${user.username}` : undefined;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <PageHeader
        title="Dashboard"
        actions={<a href="/admin/file-entry" className="btn btn-primary" id="dashboard-new-file">New File Entry</a>}
      />

      <div className="container">
        {greeting && (
          <div style={{
            fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)',
            letterSpacing: '0.04em', margin: '0 0 var(--space-lg)',
          }}>
            {greeting}
          </div>
        )}

        <form action="/admin/dashboard" method="GET" style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
            background: 'var(--bg-white)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.4rem 0.4rem 0.9rem',
            boxShadow: 'var(--elevate-1)',
          }}>
            <Search size={16} color="var(--text-muted)" aria-hidden="true" />
            <input
              name="q"
              type="text"
              defaultValue={query}
              placeholder="Search by ID, Ref No, or Description"
              style={{
                flex: 1, padding: '0.5rem 0.5rem',
                background: 'transparent', border: 'none',
                color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem', outline: 'none',
              }}
            />
            <Button type="submit" size="sm" style={{ minHeight: 40 }}>Search</Button>
            {query && (
              <a href="/admin/dashboard" className="btn btn-ghost btn-sm" style={{ minHeight: 40 }}>Clear</a>
            )}
          </div>
        </form>

        <Suspense fallback={<MetricsSkeleton />}>
          <MetricsPanel query={query} />
        </Suspense>

        <div className="section-title" style={{ margin: 'var(--space-xl) 0 var(--space-md)' }}>All Files</div>
        <Suspense key={query} fallback={
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading files...</div>
        }>
          <FilesTable query={query} page={searchParams.page} />
        </Suspense>
      </div>
    </div>
  );
}
