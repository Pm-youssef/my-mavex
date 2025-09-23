import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
    if (coupon.type === 'PERCENT') discount = Math.round((subtotal * coupon.value) * 100) / 100 / 100; // value is percent
    else discount = coupon.value;
    if (discount > subtotal) discount = subtotal;

    const total = Math.max(0, subtotal - discount);
    return NextResponse.json({ valid: true, code, type: coupon.type, value: coupon.value, discount, total });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to apply coupon' }, { status: 500 });
  }
}
