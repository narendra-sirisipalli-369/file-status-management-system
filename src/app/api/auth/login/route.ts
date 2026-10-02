import { NextResponse } from 'next/server'
import { JWT_SECRET_KEY } from '@/lib/jwtSecret'
import { logger } from '@/lib/logger'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { z } from 'zod'
import { findUserByUsername } from '@/lib/repositories/users'
import { getDepartmentById } from '@/lib/repositories/departments'
import { recordHistory } from '@/lib/repositories/statusHistory'
import { isStaff } from '@/lib/rbac'
import { isRateLimited } from '@/lib/rateLimit'

const ADMIN_COOKIE = 'admin_token'
const KIOSK_COOKIE = 'kiosk_token'

const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 5 * 60 * 1000

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  departmentId: z.string().uuid().optional(), // selected at login time, kiosk portal only
  portal: z.enum(['staff', 'kiosk']).optional(),
  role: z.enum(['ADMIN', 'USER']).optional(), // staff portal only — which login box was used
})

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null

  function logFailedLogin(username: string, reason: string) {
    logger.warn({ event: 'login_failed', username, reason, ip }, 'Login failed')
  }

  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { username, password, departmentId, portal, role } = parsed.data

    if (isRateLimited(`${ip}:${username.toLowerCase()}`, MAX_LOGIN_ATTEMPTS, LOGIN_WINDOW_MS)) {
      logger.warn({ event: 'login_rate_limited', username, ip }, 'Login rate limited')
      return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 })
    }

    const user = await findUserByUsername(username)

    if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) {
      logFailedLogin(username, !user ? 'unknown_username' : !user.isActive ? 'inactive_user' : 'bad_password')
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    // Portal separation: staff portal is ADMIN/USER, kiosk portal is KIOSK-only.
    if (portal === 'staff' && !isStaff(user.role)) {
      logFailedLogin(username, 'wrong_portal')
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }
    // Login-box separation: the Admin box only admits ADMIN, the User box only admits USER.
    if (portal === 'staff' && role && user.role !== role) {
      logFailedLogin(username, 'wrong_role')
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }
    if (portal === 'kiosk' && user.role !== 'KIOSK') {
      logFailedLogin(username, 'wrong_portal')
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    // Kiosk portal must select the department it's actually assigned to.
    if (portal === 'kiosk' && departmentId !== user.departmentId) {
      logFailedLogin(username, 'wrong_department')
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    const department = user.departmentId ? await getDepartmentById(user.departmentId) : null

    const token = await new SignJWT({
      userId: user.id,
      username: user.username,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: department?.name ?? null,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(JWT_SECRET_KEY)

    const redirectTo =
      user.role === 'KIOSK'
        ? `/kiosk/files?departmentId=${encodeURIComponent(user.departmentId!)}&departmentName=${encodeURIComponent(department?.name ?? '')}`
        : '/admin'

    const response = NextResponse.json({
      success: true,
      role: user.role,
      username: user.username,
      departmentId: user.departmentId,
      departmentName: department?.name ?? null,
      redirectTo,
    })

    response.cookies.set({
      name: user.role === 'KIOSK' ? KIOSK_COOKIE : ADMIN_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    })

    await recordHistory({ action: 'USER_LOGIN', actorUserId: user.id, remarks: `${user.role} login` })
    logger.info({ event: 'login_success', userId: user.id, username: user.username, role: user.role, ip }, 'Login succeeded')

    return response
  } catch (err) {
    logger.error({ err }, '[Auth Login]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
