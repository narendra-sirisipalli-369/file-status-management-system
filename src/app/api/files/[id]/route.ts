import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getFileDetail } from '@/lib/fileRecordService'

/**
 * GET /api/files/[id]
 * Returns a single file record (by id, fileId, secureTrackingId, or smsRefNo)
 * with its full stage list and audit history.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const detail = await getFileDetail(params.id)
    if (!detail) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    return NextResponse.json(detail)
  } catch (err) {
    logger.error({ err }, '[GET /api/files/[id]]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
