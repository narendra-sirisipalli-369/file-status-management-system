import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasAnyRole, ROLES } from '@/lib/rbac';

// Roles allowed to download the audit log CSV
const EXPORT_ROLES = [ROLES.B_LOGO, ROLES.D_LOGO, ROLES.MCPO, ROLES.STORE_OFFICE];

/** Escape a single CSV cell: wrap in quotes and double any internal quotes. */
function csvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  // Always quote cells so commas inside values are safe
  return `"${str.replace(/"/g, '""')}"`;
}

/** Format a Date (or ISO string) as DD-MMM-YYYY HH:MM IST. */
function fmtTimestamp(raw: Date | string | null | undefined): string {
  if (!raw) return '';
  const d = typeof raw === 'string' ? new Date(raw) : raw;
  if (isNaN(d.getTime())) return '';
  // IST = UTC+5:30
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const dd   = String(ist.getUTCDate()).padStart(2, '0');
  const mon  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][ist.getUTCMonth()];
  const yyyy = ist.getUTCFullYear();
  const hh   = String(ist.getUTCHours()).padStart(2, '0');
  const mm   = String(ist.getUTCMinutes()).padStart(2, '0');
  return `${dd}-${mon}-${yyyy} ${hh}:${mm} IST`;
}

export async function GET(request: Request) {
  try {
    const role = request.headers.get('x-user-role');
    if (!hasAnyRole(role, EXPORT_ROLES)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from');
    const toDate   = searchParams.get('to');
    const dept     = searchParams.get('dept');

    const where: Record<string, unknown> = {};
    if (fromDate || toDate) {
      where.dateSubmission = {};
      if (fromDate) (where.dateSubmission as Record<string, Date>).gte = new Date(fromDate);
      if (toDate)   (where.dateSubmission as Record<string, Date>).lte = new Date(toDate + 'T23:59:59');
    }
    if (dept) where.department = dept;

    const files = await prisma.fileRecord.findMany({
      where,
      include: {
        histories: { orderBy: { timestamp: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // ── Build CSV ──────────────────────────────────────────────────────────
    const HEADER = [
      'Serial No',
      'SMS Ref No',
      'Description',
      'Department',
      'Processing Type',
      'Proposal Value (INR)',
      'Date of Submission',
      'Current Stage',
      'History Stage',
      'Date / Time',
      'Inspector',
      'Remarks',
    ];

    const rows: string[] = [HEADER.map(csvCell).join(',')];

    let serial = 1;
    for (const file of files) {
      const base = [
        csvCell(serial++),
        csvCell(file.smsRefNo),
        csvCell(file.description),
        csvCell(file.department),
        csvCell(file.typeProcessing),
        csvCell(file.proposalValue),
        csvCell(fmtTimestamp(file.dateSubmission)),
        csvCell(file.status),
      ];

      if (file.histories.length === 0) {
        // File with no history entries — emit one row with blank history cols
        rows.push([...base, csvCell(''), csvCell(''), csvCell(''), csvCell('')].join(','));
      } else {
        for (const h of file.histories) {
          rows.push(
            [
              ...base,
              csvCell(h.stageName),
              csvCell(fmtTimestamp(h.timestamp)),
              csvCell(h.inspectionBy),
              csvCell(h.remarks),
            ].join(','),
          );
        }
      }
    }

    const csv = rows.join('\r\n') + '\r\n';

    // ── Filename with timestamp ────────────────────────────────────────────
    const now = new Date();
    const fileDateStr = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
    const filename = `FSMS_AuditLog_${fileDateStr}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control':       'no-store',
      },
    });
  } catch (err) {
    console.error('[Export CSV GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
