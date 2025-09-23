import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const revalidate = 60;

function toPublicShape(c: any) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    displayOrder: c.displayOrder,
    parentId: c.parentId,
    imageUrl: c.imageUrl,
    bannerUrl: c.bannerUrl,
    thumbnailUrl: c.thumbnailUrl,
    iconUrl: c.iconUrl,
    productsCount: (c as any)._count?.products || 0,
    createdAt: c.createdAt,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const withCounts = url.searchParams.get('counts') === '1';

    const items = await prisma.category.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: { _count: withCounts ? { select: { products: true } } : undefined } as any,
    });

    return NextResponse.json(items.map(toPublicShape));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
