import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { getUserCookieName, verifyUserJwt } from '@/lib/auth'

export async function GET() {
  const token = cookies().get(getUserCookieName())?.value || ''
  const user = verifyUserJwt(token)
  if (!user) return NextResponse.json({ error: 'غير مسجل الدخول' }, { status: 401 })
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } } },
  })
  return NextResponse.json({ orders })
}
