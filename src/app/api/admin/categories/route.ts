import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminJwt } from '@/lib/auth';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function slugify(input: string) {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\u0600-\u06FF\w\s-]/g, '') // allow Arabic letters, words, spaces, dash
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Normalize local asset paths to always start with a leading slash
// e.g., "img/a.png" -> "/img/a.png", "uploads/a.png" -> "/uploads/a.png"
const normalizeLocalPath = (v: string | undefined | null) => {
  const s = String(v ?? '').trim();
  if (/^(img|uploads)\//.test(s)) return `/${s}`;
  return s;
};

const createSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  slug: z.string().optional(),
  description: z.string().optional(),
  displayOrder: z.number().int().min(0).optional(),
  parentId: z.string().optional().nullable(),
  imageUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  iconUrl: z.string().optional(),
});

function hasCategoryModel(): boolean {
  const anyPrisma = prisma as any;
  return !!anyPrisma?.category && typeof anyPrisma.category.findMany === 'function';
}

function safeSort(input: string | null | undefined): 'name' | 'slug' | 'displayOrder' | 'createdAt' {
  const s = (input || '').toString();
  return (['name', 'slug', 'displayOrder', 'createdAt'] as const).includes(s as any) ? (s as any) : 'displayOrder';
}

function safeDir(input: string | null | undefined): 'asc' | 'desc' {
  return input === 'desc' ? 'desc' : 'asc';
}

async function getCategoryColumns(): Promise<Set<string>> {
  try {
    const rows = await (prisma as any).$queryRawUnsafe(
      `SELECT lower(column_name) AS c FROM information_schema.columns WHERE table_schema = 'public' AND lower(table_name) = 'category'`
    ) as Array<{ c: string }>; 
    return new Set((rows || []).map((r) => r.c));
  } catch {
    return new Set<string>();
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = cookies().get(getAdminCookieName())?.value || '';
    if (!verifyAdminJwt(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || '10')));
    const q = (searchParams.get('q') || '').trim();
    const sort = safeSort(searchParams.get('sort'));
    const dir = safeDir(searchParams.get('dir'));

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    if (hasCategoryModel()) {
      // Only select columns that actually exist in the DB to avoid migrations mismatch
      const cols = await getCategoryColumns();
      const baseSelect: any = {
        id: true,
        name: true,
        slug: true,
        description: true,
        displayOrder: true,
        parentId: true,
        createdAt: true,
      };
      if (cols.has('imageurl')) baseSelect.imageUrl = true;
      if (cols.has('bannerurl')) baseSelect.bannerUrl = true;
      if (cols.has('thumbnailurl')) baseSelect.thumbnailUrl = true;
      if (cols.has('iconurl')) baseSelect.iconUrl = true;

      const [items, total] = await Promise.all([
        (prisma as any).category.findMany({
          where,
          orderBy: { [sort]: dir },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: { ...baseSelect, _count: { select: { products: true } } },
        }),
        (prisma as any).category.count({ where }),
      ]);

      const shaped = (items as any[]).map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description ?? '',
        displayOrder: c.displayOrder ?? 0,
        parentId: c.parentId ?? null,
        imageUrl: (c as any).imageUrl ?? null,
        bannerUrl: (c as any).bannerUrl ?? null,
        thumbnailUrl: (c as any).thumbnailUrl ?? null,
        iconUrl: (c as any).iconUrl ?? null,
        productsCount: (c as any)._count?.products || 0,
        createdAt: (c as any).createdAt,
      }));
      return NextResponse.json({ items: shaped, total, page, pageSize });
    } else {
      const like = `%${q}%`;
      const whereSql = q ? 'WHERE lower(c.name) LIKE lower(?) OR lower(c.slug) LIKE lower(?)' : '';
      const orderSql = `ORDER BY c.${sort} ${dir}`;
      const limit = pageSize;
      const offset = (page - 1) * pageSize;
      const items = await prisma.$queryRawUnsafe(
        `SELECT c.id, c.name, c.slug, c.description, c.displayOrder, c.parentId, c.imageUrl, c.bannerUrl, c.thumbnailUrl, c.iconUrl, c.createdAt,
                (SELECT COUNT(*) FROM Product p WHERE p.categoryId = c.id) AS productsCount
         FROM Category c ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
        ...(q ? [like, like] as any[] : []),
        limit,
        offset,
      ) as any[];
      const countRows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS cnt FROM Category c ${whereSql}`,
        ...(q ? [like, like] as any[] : []),
      ) as any[];
      const total = countRows.length ? Number((countRows[0] as any).cnt) : 0;
      return NextResponse.json({ items, total, page, pageSize });
    }
  } catch (error: any) {
    console.error('Categories GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories', message: String(error?.message || error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = cookies().get(getAdminCookieName())?.value || '';
    if (!verifyAdminJwt(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { name, description, parentId } = parsed.data;
    const incomingSlug = parsed.data.slug?.trim()
    const slug = incomingSlug && incomingSlug.length > 0 ? slugify(incomingSlug) : slugify(name);
    const displayOrder = typeof parsed.data.displayOrder === 'number' ? parsed.data.displayOrder : 0;

    if (hasCategoryModel()) {
      // Only include columns that exist to avoid DB errors if migration wasn't applied yet
      const cols = await getCategoryColumns();
      const data: any = {
        name,
        slug,
        description: description || '',
        parentId: parentId || null,
        displayOrder,
      };
      if (cols.has('imageurl')) data.imageUrl = normalizeLocalPath((body as any)?.imageUrl) || null;
      if (cols.has('bannerurl')) data.bannerUrl = normalizeLocalPath((body as any)?.bannerUrl) || null;
      if (cols.has('thumbnailurl')) data.thumbnailUrl = normalizeLocalPath((body as any)?.thumbnailUrl) || null;
      if (cols.has('iconurl')) data.iconUrl = normalizeLocalPath((body as any)?.iconUrl) || null;

      try {
        const created = await (prisma as any).category.create({ data });
        return NextResponse.json(created, { status: 201 });
      } catch (e: any) {
        const msg = String(e?.message || '')
        // If Prisma client is not regenerated yet and rejects unknown args, retry without image fields
        if (/Unknown arg .*imageUrl|Unknown arg .*bannerUrl|Unknown arg .*thumbnailUrl|Unknown arg .*iconUrl/i.test(msg)) {
          const fallbackData: any = {
            name,
            slug,
            description: description || '',
            parentId: parentId || null,
            displayOrder,
          }
          const created = await (prisma as any).category.create({ data: fallbackData });
          return NextResponse.json(created, { status: 201 });
        }
        throw e;
      }
    } else {
      // Fallback raw SQL insert (generate id client-side)
      const id = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await prisma.$executeRawUnsafe(
        `INSERT INTO Category (id, name, slug, description, displayOrder, parentId, imageUrl, bannerUrl, thumbnailUrl, iconUrl, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        id,
        name,
        slug,
        description || '',
        displayOrder,
        parentId || null,
        normalizeLocalPath((body as any)?.imageUrl) || null,
        normalizeLocalPath((body as any)?.bannerUrl) || null,
        normalizeLocalPath((body as any)?.thumbnailUrl) || null,
        normalizeLocalPath((body as any)?.iconUrl) || null,
      );
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, name, slug, description, displayOrder, parentId, imageUrl, bannerUrl, thumbnailUrl, iconUrl, createdAt FROM Category WHERE id = ?`,
        id
      ) as any[];
      return NextResponse.json(
        rows[0] || {
          id,
          name,
          slug,
          description: description || '',
          displayOrder,
          parentId: parentId || null,
          imageUrl: normalizeLocalPath((body as any)?.imageUrl) || null,
          bannerUrl: normalizeLocalPath((body as any)?.bannerUrl) || null,
          thumbnailUrl: normalizeLocalPath((body as any)?.thumbnailUrl) || null,
          iconUrl: normalizeLocalPath((body as any)?.iconUrl) || null,
        },
        { status: 201 }
      );
    }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Slug مستخدم بالفعل' }, { status: 409 });
    }
    console.error('Categories POST error:', { message: error?.message, code: error?.code, meta: error?.meta });
    return NextResponse.json({ error: 'Failed to create category', message: String(error?.message || error), code: error?.code }, { status: 500 });
  }
}

