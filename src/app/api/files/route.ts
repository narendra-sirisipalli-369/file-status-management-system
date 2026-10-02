import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { denyAccess } from '@/lib/apiAuth'
import { createFileRecord, fileEntrySchema, getFileDetail, StageManagerNotConfiguredError, DuplicateFileDescriptionError, InvalidHeadCodeError } from '@/lib/fileRecordService'
import { listFileRecords } from '@/lib/repositories/fileRecords'
import { isStaff } from '@/lib/rbac'

export async function POST(request: Request) {
  try {
    const role = request.headers.get('x-user-role')
    const userId = request.headers.get('x-user-id')

    if (!isStaff(role)) {
      return denyAccess(request, role)
    }

    const body = await request.json()
    const parsed = fileEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
    }

    const newFile = await createFileRecord(parsed.data, { userId: userId ?? null })
    return NextResponse.json({ success: true, data: newFile })
  } catch (err) {
    if (err instanceof StageManagerNotConfiguredError || err instanceof DuplicateFileDescriptionError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    if (err instanceof InvalidHeadCodeError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    logger.error({ err }, '[File POST]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const role = request.headers.get('x-user-role')
    if (!isStaff(role)) {
      return denyAccess(request, role)
    }

    const { searchParams } = new URL(request.url)
    const ref = searchParams.get('ref')
    const from = searchParams.get('from') ?? undefined
    const to = searchParams.get('to') ?? undefined
    const departmentId = searchParams.get('dept') ?? searchParams.get('departmentId') ?? undefined
    const q = searchParams.get('q') ?? undefined

    if (ref) {
      const detail = await getFileDetail(ref)
      if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(detail)
    }

    const files = await listFileRecords({ q, from, to, departmentId })
    return NextResponse.json(files)
  } catch (err) {
    logger.error({ err }, '[File GET]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
