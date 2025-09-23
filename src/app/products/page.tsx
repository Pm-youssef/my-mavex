import prisma from '@/lib/prisma';
import ProductsClient from '@/components/ProductsClient';
import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/constants';

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: {
    canonical: `${SITE_URL}/products`,
  },
};

interface Product {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  imageUrl: string;
  stock: number;
}

export default async function ProductsPage({ searchParams }: { searchParams?: { category?: string } }) {
  const categorySlugRaw = searchParams?.category ? String(searchParams.category) : '';
  const categorySlug = decodeURIComponent(categorySlugRaw).trim();

  const where: any = {};
  if (categorySlug) {
    // Accept both slug and id in the "category" query param (case-insensitive slug)
    where.OR = [
      { category: { slug: { equals: categorySlug, mode: 'insensitive' } } as any },
      { categoryId: categorySlug },
    ];
  }

  const raw = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      variants: {
        select: { id: true, size: true, stock: true, minDisplayStock: true },
      },
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  const products = raw.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    originalPrice: Number(p.originalPrice),
    discountedPrice: Number(p.discountedPrice),
    imageUrl: p.imageUrl,
    thumbnailUrl: (p as any).thumbnailUrl ?? null,
    hoverImageUrl: (p as any).hoverImageUrl ?? null,
    stock: Number(p.stock ?? 0),
    categorySlug: p.category?.slug ?? null,
    categoryName: p.category?.name ?? null,
    variants: (p.variants || []).map((v) => ({
      id: v.id,
      size: v.size,
      stock: Number(v.stock || 0),
      minDisplayStock: Number(v.minDisplayStock || 0),
    })),
  }));

  const categories = Array.from(
    new Map(
      products
        .filter((p) => p.categorySlug && p.categoryName)
        .map((p) => [p.categorySlug as string, { slug: p.categorySlug as string, name: p.categoryName as string }])
    ).values()
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-32">
      {categorySlug && (
        <div className="max-w-[140rem] 2xl:max-w-none mx-auto px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
          <div className="mb-4"> 
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-[#0c1420]/10 bg-white text-[#0c1420] font-bold text-sm">
              قسم: {raw?.[0]?.category?.name || categorySlug}
            </span>
          </div>
        </div>
      )}
      <ProductsClient products={products as any} categories={categories} />
    </div>
  );
}
