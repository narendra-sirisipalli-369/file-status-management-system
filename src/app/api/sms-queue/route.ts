import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { denyAccess } from '@/lib/apiAuth'
import { isAdmin } from '@/lib/rbac'
import { listSmsQueue } from '@/lib/repositories/smsQueue'

/** GET backs the Automation Log admin page — every queued message, sent or still pending. */
export async function GET(request: Request) {
  const role = request.headers.get('x-user-role')
  if (!isAdmin(role)) {
    return denyAccess(request, role)
  }
  try {
    const rows = await listSmsQueue()
    return NextResponse.json(rows)
  } catch (err) {
    logger.error({ err }, '[SMS Queue GET]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
