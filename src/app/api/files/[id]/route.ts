import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/files/[fileId]
 * Returns a single file record by its fileId (cuid) with full status history.
 * Used by kiosk file detail page and admin file detail page.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const file = await prisma.fileRecord.findFirst({
      where: {
        OR: [
          { fileId: params.id },
          { id: params.id },
        ],
      },
      include: {
        histories: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Strip mobileNumber for privacy
    const { mobileNumber: _stripped, ...safeFile } = file as any;
    return NextResponse.json(safeFile);
  } catch (err) {
    console.error('[GET /api/files/[fileId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
