import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminJwt } from '@/lib/auth';
import { productSchema } from '@/lib/validation';
import { FALLBACK_IMAGE_URL } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Normalize local asset paths to always start with a leading slash
// e.g., "img/a.png" -> "/img/a.png", "uploads/a.png" -> "/uploads/a.png"
const normalizeLocalPath = (v: string | undefined | null) => {
  const s = String(v ?? '').trim();
  if (/^(img|uploads)\//.test(s)) return `/${s}`;
  return s;
};

// Safely parse features string (JSON) to array of strings
const parseFeatures = (s: unknown): string[] => {
  try {
    const val = typeof s === 'string' ? JSON.parse(s) : Array.isArray(s) ? s : [];
    return (Array.isArray(val) ? val : [])
      .map((v) => String(v ?? '').trim())
      .filter((v) => v.length > 0)
      .slice(0, 12);
  } catch {
    return [];
  }
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: true,
      },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({
      ...product,
      features: parseFeatures((product as any).features),
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = cookies().get(getAdminCookieName())?.value || '';
    if (!verifyAdminJwt(token)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    const body = await request.json();

    const name = String(body?.name || '').trim();
    const description = String(body?.description || '').trim();
    const originalPriceRaw = body?.originalPrice;
    const discountedPriceRaw = body?.discountedPrice;
    const originalPrice = Number(originalPriceRaw);
    let discountedPrice = Number(discountedPriceRaw);
    if (Number.isNaN(discountedPrice)) discountedPrice = originalPrice;
    const stock = Number(body?.stock ?? 0) || 0;
    const imageUrl = normalizeLocalPath(body?.imageUrl) || FALLBACK_IMAGE_URL;
    const hoverImageUrl = normalizeLocalPath(body?.hoverImageUrl);
    const thumbnailUrl = normalizeLocalPath(body?.thumbnailUrl);
    const image2Url = normalizeLocalPath(body?.image2Url);
    const image3Url = normalizeLocalPath(body?.image3Url);
    const discountEndsAtStr = String(body?.discountEndsAt ?? '').trim();
    const hasDiscountEndsKey = Object.prototype.hasOwnProperty.call(body || {}, 'discountEndsAt');
    const hasDiscountEnds = discountEndsAtStr.length > 0 && !Number.isNaN(Date.parse(discountEndsAtStr));

    // features: optional array of strings (1..12)
    const hasFeaturesKey = Object.prototype.hasOwnProperty.call(body || {}, 'features');
    const featuresInputRaw = Array.isArray(body?.features) ? body.features : [];
    const featuresInput: string[] = (featuresInputRaw as any[])
      .map((v) => String(v ?? '').trim())
      .filter((v) => v.length > 0)
      .slice(0, 12);

    const parsed = productSchema.safeParse({
      name,
      description,
      originalPrice,
      discountedPrice,
      imageUrl,
      hoverImageUrl,
      thumbnailUrl,
      image2Url,
      image3Url,
      stock,
      discountEndsAt: discountEndsAtStr,
      features: featuresInput,
      // variants are not updated here
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      try {
        for (const issue of (parsed as any).error.issues || []) {
          const path = Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path || '');
          if (path && !fieldErrors[path]) fieldErrors[path] = issue.message || 'غير صالح';
        }
      } catch {}
      return NextResponse.json(
        { error: (parsed as any).error?.errors?.[0]?.message || 'Invalid product data', fieldErrors },
        { status: 400 }
      );
    }

    // Detect optional fields presence
    const hasCategoryKey = Object.prototype.hasOwnProperty.call(body || {}, 'categoryId');
    const categoryIdRaw = String(body?.categoryId ?? '').trim();
    const hasVariantsKey = Object.prototype.hasOwnProperty.call(body || {}, 'variants');
    const variantsInput = Array.isArray(body?.variants)
      ? (body.variants as any[])
          .map((v) => ({
            size: String((v as any)?.size || '').trim(),
            stock: Number((v as any)?.stock) || 0,
            minDisplayStock: Number((v as any)?.minDisplayStock) || 0,
          }))
          .filter((v) => v.size.length > 0)
      : [];

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: ({
        name,
        description,
        originalPrice,
        discountedPrice,
        imageUrl,
        hoverImageUrl: hoverImageUrl || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        image2Url: image2Url || undefined,
        image3Url: image3Url || undefined,
        stock,
        ...(hasDiscountEndsKey
          ? hasDiscountEnds
            ? { discountEndsAt: new Date(discountEndsAtStr) }
            : { discountEndsAt: null }
          : {}),
        ...(hasFeaturesKey ? { features: JSON.stringify(featuresInput) } : {}),
        ...(hasCategoryKey ? { categoryId: categoryIdRaw || null } : {}),
      } as any),
    });

    // Replace variants (optional): if variants are provided in the request, we replace the set
    if (hasVariantsKey) {
      await prisma.$transaction([
        prisma.productVariant.deleteMany({ where: { productId: params.id } }),
        ...(variantsInput.length > 0
          ? [
              prisma.productVariant.createMany({
                data: variantsInput.map((v) => ({
                  productId: params.id,
                  size: v.size,
                  stock: v.stock,
                  minDisplayStock: v.minDisplayStock,
                })),
              }),
            ]
          : []),
      ]);
    }

    // Fetch latest variants to include in response
    const variants = await prisma.productVariant.findMany({
      where: { productId: params.id },
      select: { id: true, size: true, stock: true, minDisplayStock: true },
    });

    return NextResponse.json({
      ...updated,
      features: parseFeatures((updated as any).features),
      variants,
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    console.error('PUT /api/products/[id] error:', error?.message || error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = cookies().get(getAdminCookieName())?.value || '';
    if (!verifyAdminJwt(token)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Product not found or server error' },
      { status: 500 }
    );
  }
}
