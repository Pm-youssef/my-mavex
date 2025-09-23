import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminJwt } from '@/lib/auth';

export async function GET() {
  try {
    const token = cookies().get(getAdminCookieName())?.value || '';
    const payload = verifyAdminJwt(token);
    const isAuthenticated = !!payload;
    return NextResponse.json({ isAuthenticated });
  } catch {
    return NextResponse.json({ isAuthenticated: false });
  }
}
