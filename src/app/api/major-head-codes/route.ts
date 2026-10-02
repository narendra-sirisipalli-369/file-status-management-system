import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { denyAccess } from '@/lib/apiAuth'
import { z } from 'zod'
import { isAdmin, isStaff } from '@/lib/rbac'
import { listMajorHeadCodes, findOrCreateMajorHeadCode, updateMajorHeadCode, deleteMajorHeadCode } from '@/lib/repositories/majorHeadCodes'

/** GET is available to any staff user (ADMIN or USER) — the file entry form needs it. */
export async function GET(request: Request) {
  const role = request.headers.get('x-user-role')
  if (!isStaff(role)) {
    return denyAccess(request, role)
  }
  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('activeOnly') !== 'false'
  return NextResponse.json(await listMajorHeadCodes({ activeOnly }))
}

const createSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
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

  const major = await findOrCreateMajorHeadCode(parsed.data, userId ?? null)
  return NextResponse.json({ success: true, data: major }, { status: 201 })
}

const updateSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
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

  const updated = await updateMajorHeadCode(id, parsed.data)
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
    const deleted = await deleteMajorHeadCode(id)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23503') {
      return NextResponse.json({ error: 'Cannot delete: this Major Head Code is still referenced by a Minor Head Code' }, { status: 409 })
    }
    logger.error({ err }, '[Major Head Codes DELETE]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
