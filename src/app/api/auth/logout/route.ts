import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const response = NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL ?? 'http://localhost:3000'));
  response.cookies.set({ name: 'token', value: '', maxAge: 0, path: '/' });
  return response;
}
