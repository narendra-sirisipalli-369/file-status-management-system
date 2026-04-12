import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-for-dev'
);

// Routes allowed without any authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/api/auth',
  '/kiosk',
  '/api/kiosk',
  '/api/users/list',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'));
}

// Mailman roles — locked to /admin/scan only
const MAILMAN_ROLES = ['MAILMAN_INTERNAL', 'MAILMAN_EXTERNAL', 'MAILMAN'];

// Routes restricted by role
const BLOGO_ONLY = ['/admin/users'];
const FILE_ENTRY_ALLOWED = ['B_LOGO', 'D_LOGO', 'INWARD', 'STORE_OFFICE'];
const MAILMAN_ALLOWED = ['/admin/scan'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // Fully public routes
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // All other routes require valid JWT
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const role = payload.role as string;

    // MAILMAN: locked to /admin/scan only within the admin namespace
    if (MAILMAN_ROLES.includes(role) && pathname.startsWith('/admin') && !MAILMAN_ALLOWED.some(p => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/admin/scan', request.url));
    }

    // B_LOGO restricted pages (User Management)
    if (BLOGO_ONLY.some(p => pathname.startsWith(p)) && role !== 'B_LOGO') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // File Entry — only allowed for B_LOGO, INWARD, STORE_OFFICE
    if (pathname.startsWith('/admin/file-entry') && !FILE_ENTRY_ALLOWED.includes(role)) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // Inject user context headers for server components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id',          String(payload.userId));
    requestHeaders.set('x-user-role',         role);
    requestHeaders.set('x-username',          String(payload.username));
    requestHeaders.set('x-login-department',  String(payload.loginDepartment ?? ''));

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    // Invalid or expired token
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/|logo/).*)'],
};
