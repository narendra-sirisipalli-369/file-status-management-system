import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ROLES } from '@/lib/rbac';

const createUserSchema = z.object({
  username:   z.string().min(3).max(30),
  password:   z.string().min(6),
  role:       z.enum(['B_LOGO', 'D_LOGO', 'INWARD', 'MAILMAN']),
  department: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const role = request.headers.get('x-user-role');
    if (role !== ROLES.B_LOGO) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, department: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userRole = request.headers.get('x-user-role');
    if (userRole !== ROLES.B_LOGO) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body   = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });
    }

    const { username, password, role, department } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user   = await prisma.user.create({
      data: { username, password: hashed, role, department },
      select: { id: true, username: true, role: true, department: true, createdAt: true },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const role = request.headers.get('x-user-role');
  if (role !== ROLES.B_LOGO) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
