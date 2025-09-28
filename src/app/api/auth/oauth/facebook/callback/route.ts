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
  const { FACEBOOK_APP_ID, FACEBOOK_APP_SECRET } = process.env as Record<string, string | undefined>
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    return NextResponse.redirect(new URL('/account/login?error=facebook_not_configured', getOrigin(req)))
  }
  const url = new URL(req.url)
  const code = url.searchParams.get('code') || ''
  const state = url.searchParams.get('state') || ''
  const stateCookie = cookies().get('oauth_state_facebook')?.value || ''
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(new URL('/account/login?error=invalid_state', getOrigin(req)))
  }

  try {
    const redirect_uri = `${getOrigin(req)}/api/auth/oauth/facebook/callback`
    const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token?' + new URLSearchParams({
      client_id: FACEBOOK_APP_ID,
      redirect_uri,
      client_secret: FACEBOOK_APP_SECRET,
      code,
    }).toString())
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok) throw new Error(tokenJson?.error?.message || 'token_error')

    const meRes = await fetch('https://graph.facebook.com/me?fields=id,name,email', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    })
    const me = await meRes.json()
    if (!meRes.ok) throw new Error('userinfo_error')

    const email = String(me?.email || '').toLowerCase()
    const name = String(me?.name || '')
    if (!email) {
      return NextResponse.redirect(new URL('/account/login?error=no_email_from_facebook', getOrigin(req)))
    }

    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      const randomPw = Math.random().toString(36).repeat(3)
      const passwordHash = await bcrypt.hash(randomPw, 10)
      user = await prisma.user.create({ data: { email, name: name || null, passwordHash } })
    }

    const token = signUserJwt({ id: user.id, email: user.email, name: user.name })
    cookies().set(getUserCookieName(), token, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30 })
    cookies().set('oauth_state_facebook', '', { path: '/', maxAge: 0 })
    return NextResponse.redirect(new URL('/', getOrigin(req)))
  } catch (e) {
    return NextResponse.redirect(new URL('/account/login?error=facebook_oauth_failed', getOrigin(req)))
  }
}
