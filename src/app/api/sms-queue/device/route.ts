import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { listPendingSms, markSmsSent } from '@/lib/repositories/smsQueue'

/**
 * Device-facing endpoints for the Android tablet that actually sends texts
 * via its SIM (see sql/migrations/0011_sms_queue.sql). Not a browser session
 * — auth is a shared key header instead of the admin/kiosk login cookie, so
 * this route is listed in middleware.ts's PUBLIC_ROUTES and does its own
 * check here.
 *
 * GET  -> the messages still waiting to be sent.
 * POST -> the device reports which ids it actually sent; those flip from
 *         PENDING to SENT and the Automation Log page reflects it immediately.
 */
function isAuthorizedDevice(request: Request): boolean {
  const key = request.headers.get('x-device-key')
  const expected = process.env.SMS_DEVICE_API_KEY
  return !!expected && key === expected
}

export async function GET(request: Request) {
  if (!isAuthorizedDevice(request)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  try {
    const pending = await listPendingSms()
    return NextResponse.json(pending)
  } catch (err) {
    logger.error({ err }, '[SMS Queue Device GET]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const markSentSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export async function POST(request: Request) {
  if (!isAuthorizedDevice(request)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const parsed = markSentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
    }
    const updated = await markSmsSent(parsed.data.ids)
    logger.info({ event: 'sms_marked_sent', count: updated }, 'Device reported messages sent')
    return NextResponse.json({ success: true, updated })
  } catch (err) {
    logger.error({ err }, '[SMS Queue Device POST]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
