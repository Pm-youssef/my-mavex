import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/orders/track?orderId=...&email=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = (searchParams.get('orderId') || '').trim()
    const email = (searchParams.get('email') || '').trim().toLowerCase()
    if (!orderId || !email) return NextResponse.json({ error: 'orderId و email مطلوبان' }, { status: 400 })
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerEmail: email },
      include: { items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } } },
    })
    if (!order) return NextResponse.json({ error: 'لم يتم العثور على الطلب' }, { status: 404 })
    return NextResponse.json({ order })
  } catch {
    return NextResponse.json({ error: 'خطأ أثناء التتبع' }, { status: 400 })
  }
}
