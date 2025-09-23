import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminJwt } from '@/lib/auth';
import { reviewUpdateSchema } from '@/lib/validation';

// PATCH /api/reviews/:id  (admin only)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get(getAdminCookieName())?.value || '';
    if (!verifyAdminJwt(token)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = reviewUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues?.[0]?.message || 'Invalid data' }, { status: 400 });
    }

    const hasImagesKey = Object.prototype.hasOwnProperty.call(parsed.data || {}, 'images');
    const data: any = { ...parsed.data };
    if (hasImagesKey) {
      const arr = Array.isArray((parsed.data as any).images) ? (parsed.data as any).images : [];
      data.images = arr.length > 0 ? JSON.stringify(arr) : null;
    }

    const updated = await prisma.review.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update review' }, { status: 400 });
  }
}

// DELETE /api/reviews/:id (admin or author by authorId)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get(getAdminCookieName())?.value || '';
    const isAdmin = !!verifyAdminJwt(token);

    if (!isAdmin) {
      // allow author self-delete if authorId provided and matches
      const body = await request.json().catch(() => null);
      const authorId = body?.authorId as string | undefined;
      if (!authorId) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
      }
      const review = await prisma.review.findUnique({ where: { id: params.id } });
      if (!review) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      if (!review.authorId || review.authorId !== authorId) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
      }
    }

    await prisma.review.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 400 });
  }
}
