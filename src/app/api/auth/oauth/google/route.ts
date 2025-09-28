import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'

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
  const { GOOGLE_CLIENT_ID } = process.env as Record<string, string | undefined>
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(new URL('/account/login?error=google_not_configured', getOrigin(req)))
  }
  const state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  cookies().set('oauth_state_google', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 })
  const origin = getOrigin(req)
  const redirectUri = `${origin}/api/auth/oauth/google/callback`
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    include_granted_scopes: 'true',
    prompt: 'consent',
  })
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  return NextResponse.redirect(authUrl)
}
