import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/users/list
 * Returns a public list of usernames (no passwords, no sensitive data)
 * for populating the login dropdown per FSMS_Report.pdf specification.
 */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        username: true,
        role: true,
        department: true,
      },
      orderBy: { username: 'asc' },
    });

    return NextResponse.json(users);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
