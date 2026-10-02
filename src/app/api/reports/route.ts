import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { denyAccess } from '@/lib/apiAuth'
import { isAdmin } from '@/lib/rbac'
import { listReportRows, parseReportFilters } from '@/lib/repositories/reports'

/** GET /api/reports — filtered preview rows for the Reports page. ADMIN only. */
export async function GET(request: Request) {
  const role = request.headers.get('x-user-role')
  if (!isAdmin(role)) {
    return denyAccess(request, role)
  }

  try {
    const { searchParams } = new URL(request.url)
    const rows = await listReportRows(parseReportFilters(searchParams))
    return NextResponse.json(rows)
  } catch (err) {
    logger.error({ err }, '[Reports GET]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
