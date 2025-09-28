import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { registerSchema } from '@/lib/validation'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { getUserCookieName, signUserJwt } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: Request) {
  try {
    let body: any = null
    try {
      body = await req.json()
    } catch {
      try {
        const fd = await req.formData()
        body = { name: fd.get('name'), email: fd.get('email'), password: fd.get('password') }
      } catch {}
    }

    // sanitize inputs
    if (typeof body?.name === 'string' && body.name.trim().length === 0) {
      body.name = undefined
    }
    if (typeof body?.email === 'string') body.email = body.email.trim()
    if (typeof body?.password === 'string') body.password = body.password.trim()

    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error?.issues?.[0]?.message || 'بيانات غير صحيحة'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const { name, email, password } = parsed.data
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      return NextResponse.json({ error: 'البريد مستخدم بالفعل' }, { status: 409 })
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { name: name || null, email: email.toLowerCase(), passwordHash } })
    const token = signUserJwt({ id: user.id, email: user.email, name: user.name })
    cookies().set(getUserCookieName(), token, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 30 })
    return NextResponse.json({ id: user.id, email: user.email, name: user.name })
  } catch (e) {
    return NextResponse.json({ error: 'فشل التسجيل' }, { status: 400 })
  }
}
