import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { denyAccess } from '@/lib/apiAuth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { isAdmin } from '@/lib/rbac'
import { listUsers, createUser, deleteUser, findUserByUsername, updateUser } from '@/lib/repositories/users'

const createUserSchema = z
  .object({
    username: z.string().min(3).max(30),
    password: z.string().min(8),
    role: z.enum(['ADMIN', 'USER', 'KIOSK']),
    departmentId: z.string().uuid().nullable().optional(),
    mobileNumber: z.string().trim().min(7).max(20).nullable().optional(),
  })
  .refine((v) => v.role !== 'KIOSK' || !!v.departmentId, {
    message: 'departmentId is required for KIOSK users',
    path: ['departmentId'],
  })

export async function GET(request: Request) {
  try {
    const role = request.headers.get('x-user-role')
    if (!isAdmin(role)) {
      return denyAccess(request, role)
    }

    const users = await listUsers()
    return NextResponse.json(users)
  } catch (err) {
    logger.error({ err }, '[Users GET]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const role = request.headers.get('x-user-role')
    if (!isAdmin(role)) {
      return denyAccess(request, role)
    }

    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
    }

    const { username, password, role: newRole, departmentId, mobileNumber } = parsed.data
    const existing = await findUserByUsername(username)
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await createUser({ username, password: hashed, role: newRole, departmentId: departmentId ?? null, mobileNumber: mobileNumber ?? null })

    return NextResponse.json({ success: true, data: user }, { status: 201 })
  } catch (err: unknown) {
    // Partial unique indexes (one_admin_only / one_kiosk_per_department) surface as pg error 23505.
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
      return NextResponse.json(
        { error: 'This violates a uniqueness rule: only one ADMIN may exist, and only one KIOSK user per department.' },
        { status: 409 }
      )
    }
    logger.error({ err }, '[Users POST]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

const updateUserSchema = z
  .object({
    username: z.string().min(3).max(30).optional(),
    password: z.string().min(8).optional(),
    mobileNumber: z.string().trim().min(7).max(20).nullable().optional(),
  })
  .refine((v) => v.username !== undefined || v.password !== undefined || v.mobileNumber !== undefined, {
    message: 'At least one field must be provided',
    path: [],
  })

export async function PATCH(request: Request) {
  const role = request.headers.get('x-user-role')
  if (!isAdmin(role)) {
    return denyAccess(request, role)
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
    }

    if (parsed.data.username) {
      const existing = await findUserByUsername(parsed.data.username)
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
      }
    }

    const hashedPassword = parsed.data.password ? await bcrypt.hash(parsed.data.password, 10) : undefined
    const updatedUser = await updateUser(id, {
      username: parsed.data.username,
      password: hashedPassword,
      mobileNumber: parsed.data.mobileNumber,
    })

    if (!updatedUser) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: updatedUser })
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
      return NextResponse.json(
        { error: 'This violates a uniqueness rule: only one ADMIN may exist, and only one KIOSK user per department.' },
        { status: 409 }
      )
    }
    logger.error({ err }, '[Users PATCH]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
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
    await deleteUser(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error({ err }, '[Users DELETE]')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
