import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { MAILMAN_ROLES, AppRole } from '@/lib/rbac';

const mailmanSchema = z.object({
  stageName: z.enum(['Received', 'Submitted']),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const role     = request.headers.get('x-user-role') ?? '';
  const username = request.headers.get('x-username')  ?? 'Mailman';
  const userId = request.headers.get('x-user-id') ?? undefined;

  // Only MAILMAN may access this endpoint
  if (!MAILMAN_ROLES.includes(role as AppRole)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const body   = await request.json();
  const parsed = mailmanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid stage. Allowed: Received, Submitted.' }, { status: 400 });
  }

  const { stageName } = parsed.data;

  const file = await prisma.fileRecord.findUnique({ where: { id: params.id } });
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  await prisma.$transaction([
    prisma.fileRecord.update({
      where: { id: params.id },
      data:  { status: stageName },
    }),
    prisma.statusHistory.create({
      data: {
        fileRecordId: params.id,
        stageName,
        inspectionBy: username,
        remarks:      `File ${stageName.toLowerCase()} by Mailman (physical QR scan).`,
        actorUserId: userId,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
