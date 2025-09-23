import { NextResponse } from 'next/server';
import { getAdminCookieName, isProduction } from '@/lib/auth';

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
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// Optional: allow GET to perform logout as well
export async function GET() {
  return POST();
}
