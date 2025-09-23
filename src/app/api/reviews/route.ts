import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { reviewCreateSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminJwt } from '@/lib/auth';

// GET /api/reviews?productId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const token = cookies().get(getAdminCookieName())?.value || '';
    const isAdmin = !!verifyAdminJwt(token);
    const where: any = { productId };
    if (!isAdmin) where.status = 'approved';

    const reviews = await prisma.review.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });

    // normalize images string -> array
    const normalized = reviews.map((r: any) => {
      let images: string[] | undefined = undefined;
      if (typeof r.images === 'string' && r.images.trim().length > 0) {
        try {
          const arr = JSON.parse(r.images);
          if (Array.isArray(arr)) {
            images = arr.filter((s) => typeof s === 'string' && s.trim().length > 0);
          } else if (typeof r.images === 'string') {
            images = [r.images];
          }
        } catch {
          images = [r.images];
        }
      }
      return { ...r, images };
    });

    return NextResponse.json(normalized);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST /api/reviews
export async function POST(request: Request) {
  try {
    // Rate limit reviews creation: 20 requests / hour per IP
    const rl = rateLimit(request, 'reviews-post', { limit: 20, windowMs: 60 * 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    const body = await request.json();
    const parsed = reviewCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues?.[0]?.message || 'Invalid data' }, { status: 400 });
    }

    const { productId, rating, comment, authorId, images } = parsed.data as any;

    const created = await prisma.review.create({
      data: ({
        productId,
        rating,
        comment: comment?.trim() || undefined,
        authorId: authorId?.trim() || undefined,
        images: Array.isArray(images) && images.length > 0 ? JSON.stringify(images) : null,
        status: 'pending',
      } as any),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/reviews error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 400 });
  }
}
