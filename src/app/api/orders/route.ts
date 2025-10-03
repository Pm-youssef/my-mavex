import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminJwt } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const token = cookies().get(getAdminCookieName())?.value || '';
    const payload = verifyAdminJwt(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        userId: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        totalAmount: true,
        subtotal: true,
        shippingCost: true,
        status: true,
        paymentMethod: true,
        shippingMethod: true,
        createdAt: true,
        updatedAt: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
