import { prisma } from '@/lib/prisma';

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    'Inward':           'badge-inward',
    'D Logo':           'badge-dlogo',
    'B Logo':           'badge-blogo',
    'CO Stage':         'badge-co',
    'Store Office':     'badge-store',
    'IFA':              'badge-ifa',
    'Tender Prep':      'badge-done',
    'Tender Published': 'badge-done',
    'Bid Awarded':      'badge-done',
  };
  return map[status] ?? 'badge-inward';
}

export default async function FilesListPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; dept?: string; q?: string };
}) {
  const { from, to, dept, q } = searchParams;

  // Build date range filter
  const where: Record<string, any> = {};

  if (q) {
    where.OR = [
      { smsRefNo:   { contains: q } },
      { description: { contains: q } },
      { secureTrackingId: { contains: q } },
    ];
  }

  if (from || to) {
    where.dateSubmission = {};
    if (from) where.dateSubmission.gte = new Date(from + 'T00:00:00');
    if (to)   where.dateSubmission.lte = new Date(to   + 'T23:59:59');
  }

  if (dept) where.department = dept;

  const files = await prisma.fileRecord.findMany({
    where,
    include: {
      histories: { orderBy: { timestamp: 'desc' }, take: 1 },
    },
    orderBy: { dateSubmission: 'desc' },
  });

  const rangeLabel =
    from && to   ? `${fmtDate(from)} to ${fmtDate(to)}` :
    from         ? `From ${fmtDate(from)}` :
    to           ? `Up to ${fmtDate(to)}`  : 'All Dates';

  const backHref = '/admin';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-title">File List</div>
          <div className="page-sub">
            Showing {files.length} records: {rangeLabel}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <a href={backHref} className="btn btn-ghost" id="back-to-home">
            Back to Search
          </a>
          <a href="/admin/file-entry" className="btn btn-primary" id="new-file-link">
            New File Entry
          </a>
        </div>
      </div>

      {/* Global Quick Scan + Search within results */}
      <div style={{ padding: 'var(--space-md) var(--space-xl)', background: 'var(--bg-white)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        
        {/* QR Scan Section */}
        <div style={{ background: '#f8fafc', padding: '1rem', border: '1px dashed #cbd5e1', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick File Scan
          </div>
          <form action="/admin/files/scan" method="GET" style={{ flex: 1, display: 'flex', gap: 'var(--space-sm)' }}>
            <div className="scanner-box" style={{ flex: 1, minHeight: 40, border: '1px solid var(--navy)', background: '#fff' }}>
              <div className="scanner-indicator" />
              <input
                name="qr"
                type="text"
                placeholder="Scan QR here to open file"
                autoComplete="off"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--navy)' }}
              />
            </div>
          </form>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Scan physical QR to open file details instantly.</div>
        </div>

        {/* Regular Text Search */}
        <form action="/admin/files" method="GET" style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
          {from && <input type="hidden" name="from" value={from} />}
          {to   && <input type="hidden" name="to"   value={to} />}
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

      {/* File Table */}
      <div className="container">
        {files.length === 0 ? (
          <div style={{
            background: 'var(--bg-white)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '4rem',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.5rem' }}>
              NO FILES FOUND
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {q ? `No files match the search term "${q}".` : 'No files exist for the selected date range.'}
            </div>
            <a href="/admin" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)', display: 'inline-flex' }}>
              Back to Search
            </a>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" aria-label="File List">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Sl. No.</th>
                  <th>File Name / Description</th>
                  <th style={{ width: 130 }}>Date of Submission</th>
                  <th style={{ width: 160 }}>SMS Number</th>
                  <th>Remarks</th>
                  <th style={{ width: 130 }}>Status</th>
                  <th style={{ width: 130 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, idx) => {
                  const lastHistory = file.histories[0];
                  return (
                    <tr key={file.id} id={`file-row-${idx + 1}`}>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {idx + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-black)' }}>
                          {file.description}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                          {file.secureTrackingId}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                        {fmtDate(file.dateSubmission)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--navy)', fontSize: '0.78rem' }}>
                        {file.smsRefNo}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: 240 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lastHistory?.remarks ?? '-'}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(file.status)}`}>
                          {file.status}
                        </span>
                      </td>
                      <td>
                        <a
                          href={`/admin/file/${file.fileId}`}
                          className="row-btn"
                          id={`open-file-${idx + 1}`}
                          aria-label={`Open file ${file.smsRefNo}`}
                        >
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
  );
}
