import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { denyAccess } from '@/lib/apiAuth'
import { z } from 'zod'
import { isAdmin } from '@/lib/rbac'
import { listDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/lib/repositories/departments'

/** GET is public (middleware allows /api/departments unauthenticated) — the kiosk login dropdown needs it. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('activeOnly') !== 'false'
  const departments = await listDepartments({ activeOnly })
  return NextResponse.json(departments)
}

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(20),
})

export async function POST(request: Request) {
  const role = request.headers.get('x-user-role')
  if (!isAdmin(role)) {
    return denyAccess(request, role)
  }

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
  }

  try {
    const department = await createDepartment(parsed.data)
    return NextResponse.json({ success: true, data: department }, { status: 201 })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
      return NextResponse.json({ error: 'A department with that name or code already exists' }, { status: 409 })
    }
    logger.error({ err }, '[Departments POST]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).max(20).optional(),
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

  const updated = await updateDepartment(id, parsed.data)
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
    const deleted = await deleteDepartment(id)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23503') {
      return NextResponse.json({ error: 'Cannot delete: this department is still referenced by users or files' }, { status: 409 })
    }
    logger.error({ err }, '[Departments DELETE]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
