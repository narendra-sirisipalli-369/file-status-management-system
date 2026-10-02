import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { ADMIN_ONLY_ROUTES } from '@/lib/rbac'
import { JWT_SECRET_KEY } from '@/lib/jwtSecret'

const ADMIN_COOKIE = 'admin_token'
const KIOSK_COOKIE = 'kiosk_token'

// Routes allowed without any authentication
const PUBLIC_ROUTES = [
  '/', '/login', '/api/auth', '/kiosk', '/api/kiosk', '/api/departments',
  // The SMS-sending Android device authenticates with its own shared key
  // (see /api/sms-queue/device/route.ts), not the admin/kiosk login cookie.
  '/api/sms-queue/device',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'))
}

function redirectForRole(request: NextRequest, role: string, departmentId?: string | null) {
  if (role === 'KIOSK') {
    return NextResponse.redirect(new URL(`/kiosk/files?departmentId=${encodeURIComponent(departmentId ?? '')}`, request.url))
  }
  return NextResponse.redirect(new URL('/admin', request.url))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const adminToken = request.cookies.get(ADMIN_COOKIE)?.value
  const kioskToken = request.cookies.get(KIOSK_COOKIE)?.value
  const token = pathname.startsWith('/kiosk') ? kioskToken : adminToken

  // Prevent navigating back to login pages when already authenticated
  if (pathname === '/login' || pathname.startsWith('/login/')) {
    if (!adminToken) return NextResponse.next()
    try {
      const { payload } = await jwtVerify(adminToken, JWT_SECRET_KEY)
      return redirectForRole(request, payload.role as string, payload.departmentId as string | null)
    } catch {
      // ignore invalid/expired token and allow login page to render
    }
  }
  if (pathname === '/kiosk/login' || pathname.startsWith('/kiosk/login/')) {
    if (!kioskToken) return NextResponse.next()
    try {
      const { payload } = await jwtVerify(kioskToken, JWT_SECRET_KEY)
      return redirectForRole(request, payload.role as string, payload.departmentId as string | null)
    } catch {
      // ignore invalid/expired token and allow login page to render
    }
  }

  if (isPublic(pathname)) {
    // Public routes never require a token, but if a valid one is present
    // (e.g. an already-logged-in ADMIN calling the "public" GET /api/departments
    // endpoint before POSTing to it), still attach identity headers so the
    // route handler's own role checks work correctly.
    if (!token) return NextResponse.next()
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_KEY)
      return NextResponse.next({ request: { headers: buildIdentityHeaders(request, payload) } })
    } catch {
      return NextResponse.next()
    }
  }

  // All other routes require a valid JWT
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY)
    const role = payload.role as string
    const departmentId = (payload.departmentId as string | null) ?? null

    // KIOSK may not access /admin routes at all — everything there is ADMIN-only.
    if (role === 'KIOSK' && pathname.startsWith('/admin')) {
      return redirectForRole(request, role, departmentId)
    }

    // USER is restricted to dashboard/file entry/file search — bounce it away
    // from master data, Procurement Process, admin management, and reports.
    if (role === 'USER' && ADMIN_ONLY_ROUTES.some((prefix) => pathname.startsWith(prefix))) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    return NextResponse.next({ request: { headers: buildIdentityHeaders(request, payload) } })
  } catch {
    // Invalid or expired token
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(ADMIN_COOKIE)
    return response
  }
}

function buildIdentityHeaders(request: NextRequest, payload: Record<string, unknown>): Headers {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', String(payload.userId))
  requestHeaders.set('x-user-role', String(payload.role))
  requestHeaders.set('x-username', String(payload.username))
  requestHeaders.set('x-department-id', String(payload.departmentId ?? ''))
  requestHeaders.set('x-department-name', String(payload.departmentName ?? ''))
  return requestHeaders
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/|logo/).*)'],
}
