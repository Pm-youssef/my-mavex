import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { getAdminCookieName, verifyAdminJwt } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const token = cookies().get(getAdminCookieName())?.value || '';
    const payload = verifyAdminJwt(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined; // new | read | archived
    const q = searchParams.get('q') || '';
    const take = Math.min(parseInt(searchParams.get('take') || '200', 10) || 200, 500);

    const where: any = {};
    if (status && ['new', 'read', 'archived'].includes(status)) where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { message: { contains: q, mode: 'insensitive' } },
      ];
    }

    const messages = await prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });

    return NextResponse.json(messages);
  } catch (e) {
    console.error('GET /api/messages error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
