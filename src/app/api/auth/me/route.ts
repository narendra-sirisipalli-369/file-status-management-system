import { NextResponse } from 'next/server'
import { JWT_SECRET_KEY } from '@/lib/jwtSecret'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const ADMIN_COOKIE = 'admin_token'

export async function GET() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(ADMIN_COOKIE)?.value
    if (!token) return NextResponse.json({ role: null, username: null })
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY)
    return NextResponse.json({
      role: payload.role,
      username: payload.username,
      departmentId: payload.departmentId,
      departmentName: payload.departmentName,
    })
  } catch {
    return NextResponse.json({ role: null, username: null })
  }
}
