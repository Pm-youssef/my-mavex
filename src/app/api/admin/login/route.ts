import { NextResponse } from 'next/server';
import { getAdminCookieName, signAdminJwt, isProduction } from '@/lib/auth';
import { adminLoginSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate limit: 5 attempts / 5 minutes per IP
    const rl = rateLimit(request, 'admin-login', { limit: 5, windowMs: 5 * 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }
    const body = await request.json();
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const ok = parsed.data.password === process.env.ADMIN_PASSWORD;
    if (!ok) {
      return NextResponse.json(
        { error: 'كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    const token = signAdminJwt({ role: 'admin' });
    const res = NextResponse.json({ success: true });
    res.cookies.set(getAdminCookieName(), token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: isProduction(),
      maxAge: 60 * 60 * 24 * 7, // 7d
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
