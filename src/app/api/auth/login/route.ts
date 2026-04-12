import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { z } from 'zod';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-for-dev'
);

const loginSchema = z.object({
  username:   z.string().min(1),
  password:   z.string().min(1),
  department: z.string().optional(),  // selected at login time
});

export async function POST(request: Request) {
  try {
    const body   = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { username, password, department } = parsed.data;
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Use login-time department if provided, else fallback to user's assigned department
    const loginDepartment = department ?? user.department ?? 'Logistics';

    const token = await new SignJWT({
      userId:          user.id,
      username:        user.username,
      role:            user.role,
      department:      user.department,
      loginDepartment,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(SECRET_KEY);

    // Route based on role
    let redirectTo = '/admin';
    if (user.role === 'KIOSK_USER') {
      redirectTo = `/kiosk/home?department=${encodeURIComponent(loginDepartment)}`;
    } else if (['MAILMAN', 'MAILMAN_INTERNAL', 'MAILMAN_EXTERNAL'].includes(user.role)) {
      redirectTo = '/admin/scan';
    }

    const response = NextResponse.json({
      success: true,
      role:    user.role,
      username: user.username,
      loginDepartment,
      redirectTo,
    });

    response.cookies.set({
      name:     'token',
      value:    token,
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
      maxAge:   60 * 60 * 8,
    });

    return response;
  } catch (err) {
    console.error('[Auth Login]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
