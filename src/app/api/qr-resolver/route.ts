import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidTrackingId } from '@/lib/trackingId';

/**
 * GET /api/qr-resolver?id=<secureTrackingId|fileId|raw>
 *
 * Priority order:
 *  1. secureTrackingId (IND-CV format, O(1) indexed)
 *  2. fileId (legacy cuid-based, O(1) indexed)
 *  3. smsRefNo (O(1) indexed, admin fallback)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('id')?.trim();

  if (!raw) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  try {
    // 1️⃣  Secure IND-CV format — validate format first (zero DB query on bad ID)
    if (isValidTrackingId(raw)) {
      const file = await prisma.fileRecord.findUnique({
        where:   { secureTrackingId: raw },
        include: { histories: { orderBy: { timestamp: 'asc' } } },
      });
      if (file) return NextResponse.json({ file });
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // 2️⃣  Legacy fileId (cuid)
    const byFileId = await prisma.fileRecord.findUnique({
      where:   { fileId: raw },
      include: { histories: { orderBy: { timestamp: 'asc' } } },
    });
    if (byFileId) return NextResponse.json({ file: byFileId });

    // 3️⃣  smsRefNo fallback
    const byRef = await prisma.fileRecord.findUnique({
      where:   { smsRefNo: raw },
      include: { histories: { orderBy: { timestamp: 'asc' } } },
    });
    if (byRef) {
      return NextResponse.json({ file: byRef });
    }

    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  } catch (err) {
    console.error('[QR Resolver] EXCEPTION:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
