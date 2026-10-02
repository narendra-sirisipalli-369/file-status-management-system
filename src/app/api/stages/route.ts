import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { denyAccess } from '@/lib/apiAuth'
import { z } from 'zod'
import { isAdmin } from '@/lib/rbac'
import { listStages, createStage, updateStage, deleteStages } from '@/lib/repositories/stages'

export async function GET(request: Request) {
  const role = request.headers.get('x-user-role')
  if (!isAdmin(role)) {
    return denyAccess(request, role)
  }
  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('activeOnly') !== 'false'
  return NextResponse.json(await listStages({ activeOnly }))
}

const stageTypeSchema = z.enum(['IN', 'OUT'])

const createSchema = z.object({
  name: z.string().min(1),
  stageType: stageTypeSchema,
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
    const stage = await createStage(parsed.data)
    return NextResponse.json({ success: true, data: stage }, { status: 201 })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
      return NextResponse.json({ error: 'A stage with that name already exists' }, { status: 409 })
    }
    logger.error({ err }, '[Stages POST]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  stageType: stageTypeSchema.optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
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

  const updated = await updateStage(id, parsed.data)
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: updated })
}

const deleteSchema = z.object({ ids: z.array(z.string().uuid()).min(1) })

export async function DELETE(request: Request) {
  const role = request.headers.get('x-user-role')
  if (!isAdmin(role)) {
    return denyAccess(request, role)
  }

  const body = await request.json()
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
  }

  const result = await deleteStages(parsed.data.ids)
  return NextResponse.json({ success: true, ...result })
}
