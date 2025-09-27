import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test database connection
    const products = await prisma.product.findMany({
      take: 1,
      include: {
        variants: true,
      },
    });

    // Test order schema
    const orders = await prisma.order.findMany({
      take: 1,
      include: {
        items: true,
      },
    });

    // Test coupons table
    let couponsCount = -1 as number;
    try {
      couponsCount = await (prisma as any).coupon.count();
    } catch {
      // keep as -1 to indicate missing table or error
    }

    // Test site settings presence
    let siteSettingsExists = false;
    try {
      const s = await (prisma as any).siteSettings.findUnique({ where: { id: 'default' } });
      siteSettingsExists = !!s;
    } catch {
      siteSettingsExists = false;
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      productsCount: products.length,
      ordersCount: orders.length,
      sampleProduct: products[0] || null,
      sampleOrder: orders[0] || null,
      couponsCount,
      siteSettingsExists,
    });
  } catch (error: any) {
    console.error('Database test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
