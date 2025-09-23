import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      productsCount: products.length,
      ordersCount: orders.length,
      sampleProduct: products[0] || null,
      sampleOrder: orders[0] || null,
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
