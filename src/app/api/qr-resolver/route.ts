import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getFileDetail } from '@/lib/fileRecordService'

/**
 * GET /api/qr-resolver?id=<secureTrackingId|fileId|id|smsRefNo>
 * getFileRecordByAnyId already checks all four identifiers in one indexed query.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('id')?.trim()

  if (!raw) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
  }

  try {
    const detail = await getFileDetail(raw)
    if (!detail) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    return NextResponse.json({ file: { ...detail.file, histories: detail.histories, stages: detail.stages } })
  } catch (err) {
    logger.error({ err }, '[QR Resolver]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
