import { cookies } from 'next/headers'
import { JWT_SECRET_KEY } from '@/lib/jwtSecret'
import { jwtVerify } from 'jose'

const ADMIN_COOKIE = 'admin_token'

export interface SessionUser {
  role: string
  username: string
}

/** Server-side (RSC/layout) read of the staff-portal session — ADMIN or USER. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const token = cookies().get(ADMIN_COOKIE)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY)
    return {
      role: payload.role as string,
      username: payload.username as string,
    }
  } catch {
    return null
  }
}
