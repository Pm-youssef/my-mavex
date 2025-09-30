import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { productSchema } from '@/lib/validation';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminJwt } from '@/lib/auth';
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
// GET: جميع المنتجات مع المقاسات (يدعم limit و exclude)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitStr = url.searchParams.get('limit') || '';
    const exclude = (url.searchParams.get('exclude') || '').trim();
    const take = Number(limitStr);

    const where: any = {};
    if (exclude) where.NOT = { id: exclude };

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...(Number.isFinite(take) && take > 0 ? { take } : {}),
    });

    const productsWithVariants = await Promise.all(
      products.map(async p => {
        const variants = await prisma.$queryRaw<
          { id: string; size: string; stock: number; minDisplayStock: number }[]
        >`SELECT "id", "size", "stock", "minDisplayStock" FROM "ProductVariant" WHERE "productId" = ${p.id}`;
        return { ...p, features: parseFeatures((p as any).features), variants };
      })
    );

    return NextResponse.json(productsWithVariants);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST: إضافة منتج جديد مع المقاسات
export async function POST(request: Request) {
  try {
    // admin auth
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
    if (Number.isNaN(discountedPrice)) discountedPrice = originalPrice; // افتراضيًا السعر بعد الخصم = الأصلي
    const stock = Number(body?.stock ?? 0) || 0;
    const imageUrl = normalizeLocalPath(body?.imageUrl) || FALLBACK_IMAGE_URL;
    const hoverImageUrl = normalizeLocalPath(body?.hoverImageUrl);
    const thumbnailUrl = normalizeLocalPath(body?.thumbnailUrl);
    const image2Url = normalizeLocalPath(body?.image2Url);
    const image3Url = normalizeLocalPath(body?.image3Url);
    const discountEndsAtStr = String(body?.discountEndsAt ?? '').trim();
    const hasDiscountEnds = discountEndsAtStr.length > 0 && !Number.isNaN(Date.parse(discountEndsAtStr));
    const categoryId = String(body?.categoryId || '').trim();
    // features: optional array of strings
    const featuresInputRaw = Array.isArray(body?.features) ? body.features : [];
    const featuresInput: string[] = (featuresInputRaw as any[])
      .map((v) => String(v ?? '').trim())
      .filter((v) => v.length > 0)
      .slice(0, 12);
    const variantsInput = Array.isArray(body?.variants) ? body.variants : [];

    if (!name || Number.isNaN(originalPrice) || Number.isNaN(discountedPrice)) {
      return NextResponse.json(
        {
          error:
            'Invalid payload: ensure name and prices are valid (originalPrice/discountedPrice).',
        },
        { status: 400 }
      );
    }

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
      variants: variantsInput,
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

    const data: any = {
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
      ...(hasDiscountEnds ? { discountEndsAt: new Date(discountEndsAtStr) } : {}),
      ...(categoryId ? { categoryId } : {}),
    };

    if (featuresInput.length > 0) {
      data.features = JSON.stringify(featuresInput);
    }

    if (variantsInput.length > 0) {
      data.variants = {
        create: variantsInput
          .filter((v: any) => v && v.size)
          .map((v: any) => ({
            size: String(v.size),
            stock: Number(v.stock) || 0,
            minDisplayStock: Number(v.minDisplayStock) || 0,
          })),
      };
    }

    const newProduct = await prisma.product.create({
      data,
    });

    const variants = await prisma.$queryRaw<
      { id: string; size: string; stock: number; minDisplayStock: number }[]
    >`SELECT "id", "size", "stock", "minDisplayStock" FROM "ProductVariant" WHERE "productId" = ${newProduct.id}`;

    return NextResponse.json({ ...newProduct, variants }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/products error:', error?.message || error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// PUT: تحديث منتج
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const discountEndsAtStr = String(body?.discountEndsAt ?? '').trim();
    const hasDiscountEnds = discountEndsAtStr.length > 0 && !Number.isNaN(Date.parse(discountEndsAtStr));
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        originalPrice: Number(body.originalPrice),
        discountedPrice: Number(body.discountedPrice),
        imageUrl: body.imageUrl,
        hoverImageUrl: body.hoverImageUrl || undefined,
        thumbnailUrl: body.thumbnailUrl || undefined,
        image2Url: body.image2Url || undefined,
        image3Url: body.image3Url || undefined,
        stock: Number(body.stock),
        ...(hasDiscountEnds
          ? { discountEndsAt: new Date(discountEndsAtStr) }
          : { discountEndsAt: null }),
        features: Array.isArray(body?.features)
          ? JSON.stringify(
              (body.features as any[])
                .map((v) => String(v ?? '').trim())
                .filter((v) => v.length > 0)
                .slice(0, 12)
            )
          : undefined,
      } as any,
    });
    return NextResponse.json({
      ...updatedProduct,
      features: parseFeatures((updatedProduct as any).features),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Product not found or invalid request body' },
      { status: 400 }
    );
  }
}

// DELETE: حذف منتج
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Product not found or server error' },
      { status: 500 }
    );
  }
}
