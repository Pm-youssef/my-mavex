import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const data: any = {};

    if (body.code != null) data.code = String(body.code).toUpperCase();
    if (body.type != null) data.type = String(body.type).toUpperCase(); // PERCENT | FIXED
    if (body.value != null) data.value = Number(body.value);
    if (body.minSubtotal != null) data.minSubtotal = Number(body.minSubtotal);
    if (body.usageLimit != null) data.usageLimit = Number(body.usageLimit);
    if (body.startsAt != null) data.startsAt = body.startsAt ? new Date(body.startsAt) : null;
    if (body.endsAt != null) data.endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (body.active != null) data.active = Boolean(body.active);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await (prisma as any).coupon.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e: any) {
    const msg = e?.code === 'P2002' ? 'Coupon code already exists' : 'Failed to update coupon';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    await (prisma as any).coupon.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
