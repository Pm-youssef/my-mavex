import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminJwt } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = cookies().get(getAdminCookieName())?.value || '';
    const payload = verifyAdminJwt(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const status = searchParams.get('status');
    const gov = searchParams.get('gov');
    const payment = searchParams.get('payment');
    const shipping = searchParams.get('shipping');

    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    if (status) where.status = status;
    if (gov) where.customerGovernorate = gov;
    if (payment) where.paymentMethod = payment;
    if (shipping) where.shippingMethod = shipping;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // KPIs
    const totalSales = orders.reduce((s, o: any) => s + Number(o.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const avgOrder = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

    const uniq = new Set<string>();
    orders.forEach((o: any) => uniq.add((o.customerEmail || o.customerPhone || o.id).toLowerCase()));
    const uniqueCustomers = uniq.size;

    // By day
    const fmtDay = (d: Date) => d.toISOString().slice(0, 10);
    const mapDay = new Map<string, number>();
    orders.forEach((o: any) => {
      const k = fmtDay(new Date(o.createdAt));
      mapDay.set(k, (mapDay.get(k) || 0) + Number(o.totalAmount || 0));
    });
    const days = Array.from(mapDay.keys()).sort();
    const salesByDay = days.map(k => mapDay.get(k) || 0);

    // Status distribution
    const statusMap = new Map<string, number>();
    orders.forEach((o: any) => {
      const s = o.status || 'PENDING';
      statusMap.set(s, (statusMap.get(s) || 0) + 1);
    });
    const statusDist = Array.from(statusMap.entries());

    // Top products
    const prodMap = new Map<string, { name: string; qty: number; revenue: number }>();
    orders.forEach((o: any) => {
      (o.items || []).forEach((it: any) => {
        const name = it?.product?.name || 'منتج';
        const cur = prodMap.get(name) || { name, qty: 0, revenue: 0 };
        cur.qty += Number(it.quantity || 0);
        cur.revenue += Number((it.price || 0) * (it.quantity || 0));
        prodMap.set(name, cur);
      });
    });
    const topProducts = Array.from(prodMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return NextResponse.json({
      kpis: { totalSales, totalOrders, avgOrder, uniqueCustomers },
      series: { days, salesByDay },
      distributions: { status: statusDist },
      topProducts,
      count: orders.length,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 });
  }
}

