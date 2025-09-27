import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isActiveNow(c: any) {
  const now = Date.now();
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return false;
  if (c.endsAt && new Date(c.endsAt).getTime() < now) return false;
  if (!c.active) return false;
  if (c.usageLimit != null && c.usageCount >= c.usageLimit) return false;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = String((body.code ?? '').toString().trim()).toUpperCase();
    const subtotal = Number(body.subtotal ?? 0);

    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    if (!Number.isFinite(subtotal) || subtotal <= 0) return NextResponse.json({ error: 'Invalid subtotal' }, { status: 400 });

    const coupon = await (prisma as any).coupon.findUnique({ where: { code } });
    if (!coupon || !isActiveNow(coupon)) {
      return NextResponse.json({ valid: false, reason: 'invalid_or_expired' }, { status: 200 });
    }
    if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
      return NextResponse.json({ valid: false, reason: 'min_subtotal' }, { status: 200 });
    }

    let discount = 0;
    if (coupon.type === 'PERCENT') {
      // value is percent (e.g., 10 for 10%)
      discount = Math.round((subtotal * (Number(coupon.value) / 100)) * 100) / 100;
    } else {
      discount = Number(coupon.value);
    }
    if (discount > subtotal) discount = subtotal;

    const total = Math.max(0, subtotal - discount);
    return NextResponse.json({ valid: true, code, type: coupon.type, value: coupon.value, discount, total });
  } catch (e: any) {
    if (e?.code === 'P2021') {
      // Missing coupons table: degrade gracefully for checkout UX
      return NextResponse.json({ valid: false, reason: 'service_unavailable' }, { status: 200 });
    }
    if (e?.name === 'PrismaClientInitializationError') {
      return NextResponse.json({ valid: false, reason: 'db_unreachable' }, { status: 200 });
    }
    return NextResponse.json({ error: 'Failed to apply coupon' }, { status: 500 });
  }
}
