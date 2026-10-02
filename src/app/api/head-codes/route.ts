import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { denyAccess } from '@/lib/apiAuth'
import { z } from 'zod'
import { isAdmin, isStaff } from '@/lib/rbac'
import { listHeadCodes, findOrCreateHeadCode, updateHeadCode, deleteHeadCode } from '@/lib/repositories/headCodes'

/** GET is available to any staff user (ADMIN or USER) — the file entry form needs it. Optional ?majorId= filters to Minors under that Major. */
export async function GET(request: Request) {
  const role = request.headers.get('x-user-role')
  if (!isStaff(role)) {
    return denyAccess(request, role)
  }
  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('activeOnly') !== 'false'
  const majorId = searchParams.get('majorId') ?? undefined
  return NextResponse.json(await listHeadCodes({ activeOnly, majorId }))
}

const createSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  majorId: z.string().uuid().nullable().optional(),
})

export async function POST(request: Request) {
  const role = request.headers.get('x-user-role')
  const userId = request.headers.get('x-user-id')
  if (!isAdmin(role)) {
    return denyAccess(request, role)
  }

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
  }

  const headCode = await findOrCreateHeadCode(parsed.data, userId ?? null)
  return NextResponse.json({ success: true, data: headCode }, { status: 201 })
}

/** Full edit (Master Data "Edit" action) as well as the plain activate/deactivate toggle — all fields optional. */
const updateSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  majorId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(request: Request) {
  const role = request.headers.get('x-user-role')
  if (!isAdmin(role)) {
    return denyAccess(request, role)
  }
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
  }

  const updated = await updateHeadCode(id, parsed.data)
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(request: Request) {
  const role = request.headers.get('x-user-role')
  if (!isAdmin(role)) {
    return denyAccess(request, role)
  }
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const deleted = await deleteHeadCode(id)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23503') {
      return NextResponse.json({ error: 'Cannot delete: this head code is still referenced by a Procurement Process configuration or a file' }, { status: 409 })
    }
    logger.error({ err }, '[Head Codes DELETE]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
