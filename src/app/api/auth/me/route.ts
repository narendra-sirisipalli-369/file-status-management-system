import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-for-dev'
);

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ role: null, username: null });
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return NextResponse.json({
      role:            payload.role,
      username:        payload.username,
      loginDepartment: payload.loginDepartment,
    });
  } catch {
    return NextResponse.json({ role: null, username: null });
  }
}
