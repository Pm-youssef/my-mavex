import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getUserCookieName, signUserJwt } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getOrigin(req: Request) {
  const url = new URL(req.url)
  const hdrs = headers()
  const proto = (hdrs.get('x-forwarded-proto') || url.protocol.replace(':',''))
  const host = (hdrs.get('x-forwarded-host') || hdrs.get('host') || url.host)
  return `${proto}://${host}`
}

export async function GET(req: Request) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env as Record<string, string | undefined>
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/account/login?error=google_not_configured', getOrigin(req)))
  }
  const url = new URL(req.url)
  const code = url.searchParams.get('code') || ''
  const state = url.searchParams.get('state') || ''
  const stateCookie = cookies().get('oauth_state_google')?.value || ''
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(new URL('/account/login?error=invalid_state', getOrigin(req)))
  }

  try {
    const redirect_uri = `${getOrigin(req)}/api/auth/oauth/google/callback`
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok) throw new Error(tokenJson?.error || 'token_error')

    // Prefer userinfo endpoint to get verified email and name
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    })
    const profile = await userinfoRes.json()
    if (!userinfoRes.ok) throw new Error('userinfo_error')

    const email = String(profile?.email || '').toLowerCase()
    const name = String(profile?.name || '')
    if (!email) {
      return NextResponse.redirect(new URL('/account/login?error=no_email_from_google', getOrigin(req)))
    }

    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      const randomPw = Math.random().toString(36).repeat(3)
      const passwordHash = await bcrypt.hash(randomPw, 10)
      user = await prisma.user.create({ data: { email, name: name || null, passwordHash } })
    }

    const token = signUserJwt({ id: user.id, email: user.email, name: user.name })
    cookies().set(getUserCookieName(), token, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30 })
    cookies().set('oauth_state_google', '', { path: '/', maxAge: 0 })
    return NextResponse.redirect(new URL('/', getOrigin(req)))
  } catch (e) {
    return NextResponse.redirect(new URL('/account/login?error=google_oauth_failed', getOrigin(req)))
  }
}
