import { NextResponse } from 'next/server';
import { getAdminCookieName, isProduction } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const res = NextResponse.json({ success: true });
    res.cookies.set(getAdminCookieName(), '', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: isProduction(),
      maxAge: 0,
    });
    return res;
  } catch (err) {
    console.error('[admin-login] Unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
  
}

// Optional: allow GET to perform logout as well
export async function GET() {
  return POST();
}
