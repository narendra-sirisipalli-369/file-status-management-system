import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/** Logs a role-denied access attempt as a security event, then returns the 403 response. */
export function denyAccess(request: Request, role: string | null): NextResponse {
  logger.warn(
    { event: 'access_denied', route: new URL(request.url).pathname, method: request.method, role: role ?? null },
    'Access denied'
  )
  return NextResponse.json({ error: 'Access denied' }, { status: 403 })
}
