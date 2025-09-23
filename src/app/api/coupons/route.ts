import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const coupons = await (prisma as any).coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(coupons);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load coupons' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String((body.code ?? '').toString().trim()).toUpperCase();
    const type = String((body.type ?? '').toString().trim().toUpperCase()); // PERCENT | FIXED
    const value = Number(body.value);
    const minSubtotal = body.minSubtotal != null ? Number(body.minSubtotal) : null;
    const usageLimit = body.usageLimit != null ? Number(body.usageLimit) : null;
    const startsAt = body.startsAt ? new Date(body.startsAt) : null;
    const endsAt = body.endsAt ? new Date(body.endsAt) : null;
    const active = body.active == null ? true : Boolean(body.active);

    if (!code || !type || !['PERCENT', 'FIXED'].includes(type)) {
      return NextResponse.json({ error: 'Invalid code or type' }, { status: 400 });
    }
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ error: 'Invalid value' }, { status: 400 });
    }
    if (type === 'PERCENT' && (value <= 0 || value > 100)) {
      return NextResponse.json({ error: 'Percent value must be between 1 and 100' }, { status: 400 });
    }

    const coupon = await (prisma as any).coupon.create({
      data: {
        code,
        type,
        value,
        minSubtotal: minSubtotal ?? undefined,
        usageLimit: usageLimit ?? undefined,
        startsAt: startsAt ?? undefined,
        endsAt: endsAt ?? undefined,
        active,
      },
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (e: any) {
    const msg = e?.code === 'P2002' ? 'Coupon code already exists' : 'Failed to create coupon';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
