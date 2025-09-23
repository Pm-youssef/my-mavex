import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { getUserCookieName, verifyUserJwt } from '@/lib/auth'

export async function GET() {
  const token = cookies().get(getUserCookieName())?.value || ''
  const user = verifyUserJwt(token)
  if (!user) return NextResponse.json({ error: 'غير مسجل الدخول' }, { status: 401 })
  const items = await prisma.wishlistItem.findMany({ where: { userId: user.id }, select: { productId: true } })
  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  try {
    const token = cookies().get(getUserCookieName())?.value || ''
    const user = verifyUserJwt(token)
    if (!user) return NextResponse.json({ error: 'غير مسجل الدخول' }, { status: 401 })
    const body = await req.json()
    const productId = String(body?.productId || '')
    if (!productId) return NextResponse.json({ error: 'productId مطلوب' }, { status: 400 })
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      create: { userId: user.id, productId },
      update: {},
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'خطأ أثناء الإضافة' }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  try {
    const token = cookies().get(getUserCookieName())?.value || ''
    const user = verifyUserJwt(token)
    if (!user) return NextResponse.json({ error: 'غير مسجل الدخول' }, { status: 401 })
    const body = await req.json().catch(() => ({}))
    const productId = String(body?.productId || '')
    if (!productId) return NextResponse.json({ error: 'productId مطلوب' }, { status: 400 })
    await prisma.wishlistItem.delete({ where: { userId_productId: { userId: user.id, productId } } }).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'خطأ أثناء الحذف' }, { status: 400 })
  }
}
