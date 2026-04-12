import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/kiosk/search
 *
 * Kiosk search endpoint per FSMS_Report.pdf spec.
 * Accepts: from (date), to (date), smsRefNo (optional), department (optional).
 * Returns an array of matching files (stripped of sensitive internal data).
 *
 * POST /api/kiosk/search (legacy triple-factor search kept for backward compatibility)
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from       = searchParams.get('from');
    const to         = searchParams.get('to');
    const smsRefNo   = searchParams.get('smsRefNo');
    const department = searchParams.get('department');

    // Build where clause
    const where: Record<string, unknown> = {};

    // Date range filter
    if (from && to) {
      where.dateSubmission = {
        gte: new Date(from + 'T00:00:00.000Z'),
        lte: new Date(to + 'T23:59:59.999Z'),
      };
    }

    // SMS Reference Number (exact or partial match)
    if (smsRefNo) {
      where.smsRefNo = { contains: smsRefNo };
    }

    // Department filter (for kiosk users restricted to their dept)
    if (department) {
      where.department = department;
    }

    const files = await prisma.fileRecord.findMany({
      where: where as any,
      select: {
        id: true,
        fileId: true,
        smsRefNo: true,
        description: true,
        dateSubmission: true,
        status: true,
        department: true,
        proposalValue: true,
        head: true,
        typeProcessing: true,
      },
      orderBy: { dateSubmission: 'desc' },
      take: 100,
    });

    return NextResponse.json({ files });
  } catch (err) {
    console.error('[Kiosk Search GET]', err);
    return NextResponse.json({ files: [] }, { status: 500 });
  }
}

// ── Legacy POST endpoint (triple-factor) for backward compatibility ──────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { smsRefNo, dateSubmission, mobileNumber } = body;

    if (!smsRefNo || !dateSubmission || !mobileNumber) {
      return NextResponse.json({
        error: 'Reference Number, Date of Submission, and Mobile Number are required.',
      }, { status: 400 });
    }

    const dayStart = new Date(dateSubmission + 'T00:00:00.000Z');
    const dayEnd   = new Date(dateSubmission + 'T23:59:59.999Z');

    const file = await prisma.fileRecord.findFirst({
      where: {
        smsRefNo,
        mobileNumber,
        dateSubmission: { gte: dayStart, lte: dayEnd },
      },
      include: {
        histories: { orderBy: { timestamp: 'asc' } },
      },
    });

    await new Promise(r => setTimeout(r, 300));

    if (!file) {
      return NextResponse.json({
        error: 'No matching file found. Please verify your Reference Number, Date, and Mobile Number.',
      }, { status: 404 });
    }

    const { mobileNumber: _stripped, ...safeFile } = file as any;
    return NextResponse.json({ file: safeFile });
  } catch (err) {
    console.error('[Kiosk Search POST]', err);
    return NextResponse.json({
      error: 'No matching file found.',
    }, { status: 404 });
  }
}
