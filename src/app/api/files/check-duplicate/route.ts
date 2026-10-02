import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { denyAccess } from '@/lib/apiAuth'
import { isStaff } from '@/lib/rbac'
import { findSimilarFileDescriptions } from '@/lib/repositories/fileRecords'

/**
 * GET /api/files/check-duplicate?description=...
 * Live duplicate/near-duplicate check for the File Entry form. Returns
 * matches with similarity >= 0.7 (trigram, case-insensitive); a similarity
 * of 1 is an exact match.
 */
export async function GET(request: Request) {
  const role = request.headers.get('x-user-role')
  if (!isStaff(role)) {
    return denyAccess(request, role)
  }

  const { searchParams } = new URL(request.url)
  const description = (searchParams.get('description') ?? '').trim()
  if (description.length < 3) {
    return NextResponse.json({ matches: [] })
  }

  try {
    const matches = await findSimilarFileDescriptions(description, 0.7)
    return NextResponse.json({ matches })
  } catch (err) {
    logger.error({ err }, '[Files Check-Duplicate GET]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
