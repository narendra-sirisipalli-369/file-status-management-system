import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { denyAccess } from '@/lib/apiAuth'
import { z } from 'zod'
import { isAdmin } from '@/lib/rbac'
import {
  listStageManagers,
  createStageManager,
  setStageManagerActive,
  updateStageManagerStages,
  deleteStageManager,
} from '@/lib/repositories/stageManager'

export async function GET(request: Request) {
  const role = request.headers.get('x-user-role')
  if (!isAdmin(role)) {
    return denyAccess(request, role)
  }
  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('activeOnly') !== 'false'
  return NextResponse.json(await listStageManagers({ activeOnly }))
}

const createSchema = z.object({
  procurementModeId: z.string().uuid(),
  authorityId: z.string().uuid(),
  stageIds: z.array(z.string().uuid()).min(1),
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

  try {
    const config = await createStageManager({ ...parsed.data, createdById: userId ?? null })
    return NextResponse.json({ success: true, data: config }, { status: 201 })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
      return NextResponse.json(
        { error: 'A Procurement Process configuration already exists for this Mode + Authority combination' },
        { status: 409 }
      )
    }
    logger.error({ err }, '[Stage Manager POST]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

const updateSchema = z
  .object({
    isActive: z.boolean().optional(),
    stageIds: z.array(z.string().uuid()).min(1).optional(),
  })
  .refine((v) => v.isActive !== undefined || v.stageIds !== undefined, {
    message: 'Provide isActive and/or stageIds',
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

  if (parsed.data.isActive !== undefined) {
    await setStageManagerActive(id, parsed.data.isActive)
  }
  if (parsed.data.stageIds !== undefined) {
    await updateStageManagerStages(id, parsed.data.stageIds)
  }
  return NextResponse.json({ success: true })
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
    const deleted = await deleteStageManager(id)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23503') {
      return NextResponse.json({ error: 'Cannot delete: this configuration is already used by one or more files' }, { status: 409 })
    }
    logger.error({ err }, '[Stage Manager DELETE]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
