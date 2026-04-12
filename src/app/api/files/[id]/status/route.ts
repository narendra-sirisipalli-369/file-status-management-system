import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { hasAnyRole, ROLES } from '@/lib/rbac';

const updateSchema = z.object({
  stageName:    z.string().min(1),
  inspectionBy: z.string().min(1),
  remarks:      z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const role = request.headers.get('x-user-role') ?? '';
    const user = request.headers.get('x-username')  ?? 'Unknown';
    const userId = request.headers.get('x-user-id') ?? undefined;

    // MAILMAN has no access to this endpoint
    if (!hasAnyRole(role, [ROLES.B_LOGO, ROLES.D_LOGO, ROLES.INWARD])) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body   = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const { stageName, inspectionBy, remarks } = parsed.data;

    // Fetch current file
    const file = await prisma.fileRecord.findUnique({ where: { id: params.id } });
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    // D_LOGO: can only add remarks — stage is locked to current
    if (role === 'D_LOGO' && stageName !== file.status) {
      return NextResponse.json({ error: 'D Logo access: stage cannot be altered. Use remarks only.' }, { status: 403 });
    }

    // Update file status and create history entry in a transaction
    await prisma.$transaction([
      prisma.fileRecord.update({
        where: { id: params.id },
        data:  { status: stageName },
      }),
      prisma.statusHistory.create({
        data: {
          fileRecordId: params.id,
          stageName,
          inspectionBy: inspectionBy || user,
          remarks,
          actorUserId: userId,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[File Status Update]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
