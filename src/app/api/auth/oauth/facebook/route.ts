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
  const { FACEBOOK_APP_ID } = process.env as Record<string, string | undefined>
  if (!FACEBOOK_APP_ID) {
    return NextResponse.redirect(new URL('/account/login?error=facebook_not_configured', getOrigin(req)))
  }
  const state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  cookies().set('oauth_state_facebook', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 })
  const origin = getOrigin(req)
  const redirectUri = `${origin}/api/auth/oauth/facebook/callback`
  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: redirectUri,
    state,
    response_type: 'code',
    scope: 'email,public_profile'
  })
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
  return NextResponse.redirect(authUrl)
}
