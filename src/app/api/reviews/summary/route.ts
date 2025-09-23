import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const approved = await prisma.review.aggregate({
      _avg: { rating: true },
      _count: true,
      where: { status: 'approved' as any },
    })
    const avg = Number(approved._avg.rating || 0)
    const count = Number(approved._count || 0)
    return NextResponse.json({ avg: Number(avg.toFixed(2)), count })
  } catch (e) {
    return NextResponse.json({ avg: 0, count: 0 })
  }
}
