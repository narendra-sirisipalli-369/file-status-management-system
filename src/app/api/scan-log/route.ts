import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { denyAccess } from '@/lib/apiAuth'
import { z } from 'zod'
import { isStaff, isAdmin } from '@/lib/rbac'
import { insertScanLog, listScanLogs } from '@/lib/repositories/barcodeScanLog'

const logSchema = z.object({
  rawIdentifier: z.string().min(1),
  fileRecordId: z.string().uuid().nullable().optional(),
  result: z.enum(['OPENED', 'ADVANCED', 'SKIPPED', 'NOT_FOUND', 'ERROR']),
  message: z.string().min(1),
})

/** POST is called by GlobalScanListener after every scan attempt, success or not. */
export async function POST(request: Request) {
  try {
    const role = request.headers.get('x-user-role')
    const userId = request.headers.get('x-user-id')
    if (!isStaff(role)) {
      return denyAccess(request, role)
    }

    const body = await request.json()
    const parsed = logSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
    }

    await insertScanLog({ ...parsed.data, actorUserId: userId ?? null })
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error({ err }, '[Scan Log POST]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** GET backs the Automation Log admin page. */
export async function GET(request: Request) {
  const role = request.headers.get('x-user-role')
  if (!isAdmin(role)) {
    return denyAccess(request, role)
  }
  try {
    const logs = await listScanLogs()
    return NextResponse.json(logs)
  } catch (err) {
    logger.error({ err }, '[Scan Log GET]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
