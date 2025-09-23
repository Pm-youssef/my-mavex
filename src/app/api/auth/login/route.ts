import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { loginSchema } from '@/lib/validation'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { getUserCookieName, signUserJwt } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    let body: any = null
    // Try JSON first
    try {
      body = await req.json()
    } catch {
      // Fallback to FormData
      try {
        const fd = await req.formData()
        body = { email: fd.get('email'), password: fd.get('password') }
      } catch {}
    }

    // sanitize inputs
    if (typeof body?.email === 'string') body.email = body.email.trim()
    if (typeof body?.password === 'string') body.password = body.password.trim()

    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error?.issues?.[0]?.message || 'بيانات غير صحيحة'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const { email, password } = parsed.data
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user) return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 })
    const token = signUserJwt({ id: user.id, email: user.email, name: user.name })
    cookies().set(getUserCookieName(), token, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30 })
    return NextResponse.json({ id: user.id, email: user.email, name: user.name })
  } catch (e) {
    return NextResponse.json({ error: 'فشل تسجيل الدخول' }, { status: 400 })
  }
}
