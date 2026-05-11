import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.set({ name: 'token', value: '', maxAge: 0, path: '/' });
  return response;
}
