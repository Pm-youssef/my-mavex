import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { getUserCookieName, verifyUserJwt } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const token = cookies().get(getUserCookieName())?.value || ''
    const user = verifyUserJwt(token)
    if (!user) return NextResponse.json({ error: 'غير مسجل الدخول' }, { status: 401 })
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } } },
    })
    return NextResponse.json({ orders })
  } catch {
    return NextResponse.json({ orders: [] })
  }
}
