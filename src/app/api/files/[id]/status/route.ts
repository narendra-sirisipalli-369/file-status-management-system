import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { denyAccess } from '@/lib/apiAuth'
import { z } from 'zod'
import { isAdmin } from '@/lib/rbac'
import { advanceFileStage, sendStageRemarks, StageActionError } from '@/lib/fileRecordService'

const stageActionSchema = z.object({
  /** EXIT (default) advances to the next stage. SEND sends the remarks as a message but holds the file in its current stage. SKIP advances without remarks and without sending a message. */
  action: z.enum(['EXIT', 'SEND', 'SKIP']).default('EXIT'),
  remarks: z.string().min(1).nullable().optional(),
  remarksById: z.string().uuid().nullable().optional(),
})

/**
 * POST /api/files/[id]/status
 * Single unified stage-action endpoint. ADMIN only.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const role = request.headers.get('x-user-role') ?? ''
    const userId = request.headers.get('x-user-id') ?? ''

    if (!isAdmin(role)) {
      return denyAccess(request, role)
    }

    const body = await request.json()
    const parsed = stageActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
    }

    if (parsed.data.action === 'SEND') {
      const remarks = parsed.data.remarks?.trim()
      if (!remarks) {
        return NextResponse.json({ error: 'Remarks are required to send a message.' }, { status: 400 })
      }
      await sendStageRemarks(params.id, userId, remarks, parsed.data.remarksById ?? null)
    } else if (parsed.data.action === 'SKIP') {
      await advanceFileStage(params.id, userId, null, null, { skip: true })
    } else {
      await advanceFileStage(params.id, userId, parsed.data.remarks ?? null, parsed.data.remarksById ?? null)
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof StageActionError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    logger.error({ err }, '[File Stage Action]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
