import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle Paymob webhook
  if (pathname.startsWith('/api/webhook/paymob')) {
    // Add CORS headers for webhook
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    return response
  }

  // Maintenance mode for public site (allow admin and api)
  if (
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/api') &&
    pathname !== '/maintenance'
  ) {
    try {
      const origin = request.nextUrl.origin
      // Fetch public settings to check siteOnline quickly
      // Using next middleware fetch
      // Note: avoid caching to reflect latest toggle
      // @ts-ignore
      const res = await fetch(`${origin}/api/settings`, { cache: 'no-store' }) as any
      if (res?.ok) {
        const s = await res.json()
        if (s && s.siteOnline === false) {
          const url = new URL('/maintenance', request.url)
          return NextResponse.rewrite(url)
        }
      }
    } catch {}
  }

  // Protect admin pages: require admin_session cookie for any /admin path except /admin/login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const hasAdminCookie = !!request.cookies.get('admin_session')?.value
    if (!hasAdminCookie) {
      const url = new URL('/admin/login', request.url)
      return NextResponse.redirect(url)
    }

    // Double-check validity by asking our session API with forwarded cookies
    try {
      const origin = request.nextUrl.origin
      const cookieHeader = request.headers.get('cookie') || ''
      const res = await fetch(`${origin}/api/admin/session`, {
        headers: { cookie: cookieHeader },
        cache: 'no-store',
      } as any)
      if (!res?.ok) {
        const url = new URL('/admin/login', request.url)
        return NextResponse.redirect(url)
      }
      const j = await res.json()
      if (!j?.isAuthenticated) {
        const url = new URL('/admin/login', request.url)
        return NextResponse.redirect(url)
      }
    } catch {
      const url = new URL('/admin/login', request.url)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/:path*',
  ],
}