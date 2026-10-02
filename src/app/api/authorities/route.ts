import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { denyAccess } from '@/lib/apiAuth'
import { z } from 'zod'
import { isAdmin, isStaff } from '@/lib/rbac'
import { authorities } from '@/lib/repositories/authorities'

/** GET is available to any staff user (ADMIN or USER) — the file entry form needs it. */
export async function GET(request: Request) {
  const role = request.headers.get('x-user-role')
  if (!isStaff(role)) {
    return denyAccess(request, role)
  }
  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('activeOnly') !== 'false'
  return NextResponse.json(await authorities.list({ activeOnly }))
}

const createSchema = z.object({ name: z.string().min(1) })

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

  const authority = await authorities.findOrCreate(parsed.data.name, userId ?? null)
  return NextResponse.json({ success: true, data: authority }, { status: 201 })
}

const updateSchema = z.object({ isActive: z.boolean() })

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

  const updated = await authorities.setActive(id, parsed.data.isActive)
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
    const deleted = await authorities.remove(id)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23503') {
      return NextResponse.json({ error: 'Cannot delete: this authority is still referenced by a Procurement Process configuration or a file' }, { status: 409 })
    }
    logger.error({ err }, '[Authorities DELETE]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
