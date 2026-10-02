import { listFileRecords } from '@/lib/repositories/fileRecords';
import { statusToBadge } from '@/lib/qrService';

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

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

const PAGE_SIZE = 10;

export default async function FilesListPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; dept?: string; q?: string; page?: string };
}) {
  const { from, to, dept, q } = searchParams;

  const allFiles = await listFileRecords({ from, to, departmentId: dept, q });
  const totalPages = Math.max(1, Math.ceil(allFiles.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1), totalPages);
  const files = allFiles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (dept) params.set('dept', dept);
    if (q) params.set('q', q);
    params.set('page', String(p));
    return `/admin/files?${params.toString()}`;
  };

  const backHref = '/admin';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div className="page-header">
        <div>
          <div className="page-title">File List</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <a href={backHref} className="btn btn-ghost" id="back-to-home">Back to Search</a>
          <a href="/admin/file-entry" className="btn btn-primary" id="new-file-link">New File Entry</a>
        </div>
      </div>

      <div style={{ padding: 'var(--space-md) var(--space-xl)', background: 'var(--bg-white)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

        <form action="/admin/files" method="GET" style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
          {from && <input type="hidden" name="from" value={from} />}
          {to && <input type="hidden" name="to" value={to} />}
          <input
            name="q"
            type="text"
            defaultValue={q ?? ''}
            placeholder="Search by Reference No, Description, or Tracking ID..."
            className="input-field"
            style={{ flex: 1, minWidth: 240, minHeight: 40 }}
          />
          <button type="submit" className="btn btn-primary" style={{ minHeight: 40 }}>Search</button>
          {q && <a href={`/admin/files?from=${from ?? ''}&to=${to ?? ''}`} className="btn btn-ghost" style={{ minHeight: 40 }}>Clear</a>}
        </form>
      </div>

      <div className="container">
        {allFiles.length === 0 ? (
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.5rem' }}>NO FILES FOUND</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {q ? `No files match the search term "${q}".` : 'No files exist for the selected date range.'}
            </div>
            <a href="/admin" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)', display: 'inline-flex' }}>Back to Search</a>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" aria-label="File List">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Sl. No.</th>
                  <th>Case Description</th>
                  <th style={{ width: 130 }}>Date of Submission</th>
                  <th style={{ width: 160 }}>File No</th>
                  <th style={{ width: 150 }}>Current Stage</th>
                  <th style={{ width: 130 }}>Status</th>
                  <th style={{ width: 130 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, idx) => (
                  <tr key={file.id} id={`file-row-${idx + 1}`}>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td>
                      <div className="preserve-case" style={{ fontWeight: 600, color: 'var(--text-black)' }}>{file.description}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{file.secureTrackingId}</div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{fmtDate(file.dateSubmission)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--navy)', fontSize: '0.78rem' }}>{file.smsRefNo}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{file.currentStageName ?? 'Completed'}</td>
                    <td>
                      <span className={`badge ${statusToBadge(file.status)}`}>{file.status}</span>
                    </td>
                    <td>
                      <a href={`/admin/file/${file.fileId}`} className="row-btn" id={`open-file-${idx + 1}`} aria-label={`Open file ${file.smsRefNo}`}>Open</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 'var(--space-lg)', flexWrap: 'wrap' }}>
            <a href={pageHref(page - 1)} aria-disabled={page === 1} className="btn btn-ghost btn-sm" style={page === 1 ? { pointerEvents: 'none', opacity: 0.4 } : undefined}>Prev</a>
            {pageWindow(page, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`e${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>…</span>
              ) : (
                <a key={p} href={pageHref(p)} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`} style={{ minWidth: 36, textAlign: 'center' }} aria-current={p === page ? 'page' : undefined}>{p}</a>
              )
            )}
            <a href={pageHref(page + 1)} aria-disabled={page === totalPages} className="btn btn-ghost btn-sm" style={page === totalPages ? { pointerEvents: 'none', opacity: 0.4 } : undefined}>Next</a>
          </div>
        )}
      </div>
    </div>
  );
}
