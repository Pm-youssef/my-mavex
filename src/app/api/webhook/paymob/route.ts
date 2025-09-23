import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook signature (you should implement this)
    const { order_id, success, amount_cents, currency, merchant_order_id } =
      body;

    if (success) {
      // Update order status to PAID
      await prisma.order.update({
        where: { id: merchant_order_id },
        data: {
          status: 'PAID',
          paymentId: order_id?.toString?.() ?? String(order_id),
        },
      });
    } else {
      // Update order status to FAILED
      await prisma.order.update({
        where: { id: merchant_order_id },
        data: {
          status: 'FAILED',
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
