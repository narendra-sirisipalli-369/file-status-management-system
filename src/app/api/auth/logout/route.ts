import { NextResponse } from 'next/server'
import { JWT_SECRET_KEY } from '@/lib/jwtSecret'
import { jwtVerify } from 'jose'
import { logger } from '@/lib/logger'

const ADMIN_COOKIE = 'admin_token'
const KIOSK_COOKIE = 'kiosk_token'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const portal = url.searchParams.get('portal')
  const redirectTo = portal === 'kiosk' ? '/kiosk/login' : '/login'
  const response = NextResponse.redirect(new URL(redirectTo, request.url))

  const cookieName = portal === 'kiosk' ? KIOSK_COOKIE : ADMIN_COOKIE
  const token = request.headers
    .get('cookie')
    ?.split('; ')
    .find((c) => c.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1)

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_KEY)
      logger.info({ event: 'logout', userId: payload.userId, username: payload.username, role: payload.role }, 'Logout')
    } catch {
      // Expired/invalid token — nothing to log, just clear the cookie below.
    }
  }

  response.cookies.set({ name: cookieName, value: '', maxAge: 0, path: '/' })

  return response
}
