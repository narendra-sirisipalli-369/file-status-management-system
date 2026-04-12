import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createFileRecord, fileEntrySchema } from '@/lib/fileRecordService';
import { hasAnyRole, ROLES, FILE_ENTRY_ROLES } from '@/lib/rbac';

export async function POST(request: Request) {
  try {
    const role = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id') ?? undefined;
    const username = request.headers.get('x-username') ?? undefined;

    if (!hasAnyRole(role, FILE_ENTRY_ROLES)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body   = await request.json();
    const parsed = fileEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const newFile = await createFileRecord(parsed.data, { userId, username });

    return NextResponse.json({ success: true, data: newFile });
  } catch (err) {
    console.error('[File POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const role = request.headers.get('x-user-role');
    if (!hasAnyRole(role, [ROLES.B_LOGO, ROLES.D_LOGO, ROLES.INWARD])) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const ref      = searchParams.get('ref');
    const fromDate = searchParams.get('from');
    const toDate   = searchParams.get('to');
    const dept     = searchParams.get('dept');
    const q        = searchParams.get('q');   // IND-CV search for admin dashboard

    if (ref) {
      const file = await prisma.fileRecord.findUnique({
        where:   { smsRefNo: ref },
        include: { histories: { orderBy: { timestamp: 'asc' } } },
      });
      if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(file);
    }

    const where: Record<string, any> = {};

    if (q) {
      where.OR = [
        { secureTrackingId: { contains: q } },
        { smsRefNo:         { contains: q } },
        { description:      { contains: q } },
      ];
    }

    if (fromDate || toDate) {
      where.dateSubmission = {};
      if (fromDate) where.dateSubmission.gte = new Date(fromDate);
      if (toDate)   where.dateSubmission.lte = new Date(toDate + 'T23:59:59');
    }
    if (dept) where.department = dept;

    const files = await prisma.fileRecord.findMany({
      where,
      include: { histories: { orderBy: { timestamp: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(files);
  } catch (err) {
    console.error('[File GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
