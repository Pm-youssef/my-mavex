import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUserCookieName, verifyUserJwt } from '@/lib/auth'

export async function GET() {
  const token = cookies().get(getUserCookieName())?.value || ''
  const payload = verifyUserJwt(token)
  if (!payload) return NextResponse.json({ isAuthenticated: false })
  return NextResponse.json({ isAuthenticated: true, user: payload })
}
