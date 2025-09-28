import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUserCookieName } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  cookies().set(getUserCookieName(), '', { path: '/', maxAge: 0 })
  return NextResponse.json({ ok: true })
}
