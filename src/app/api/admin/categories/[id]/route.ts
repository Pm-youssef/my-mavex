import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminJwt } from '@/lib/auth';
import { z } from 'zod';

function slugify(input: string) {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\u0600-\u06FF\w\s-]/g, '')
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

const updateSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب').optional(),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  parentId: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  bannerUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  iconUrl: z.string().optional().nullable(),
});

function hasCategoryModel(): boolean {
  const anyPrisma = prisma as any;
  return !!anyPrisma?.category && typeof anyPrisma.category.update === 'function';
}

async function getCategoryColumns(): Promise<Set<string>> {
  try {
    const rows = await (prisma as any).$queryRawUnsafe(
      `SELECT lower(column_name) AS c FROM information_schema.columns WHERE table_schema = 'public' AND lower(table_name) = 'category'`
    ) as Array<{ c: string }>
    return new Set((rows || []).map((r) => r.c))
  } catch {
    return new Set<string>()
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get(getAdminCookieName())?.value || '';
    if (!verifyAdminJwt(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = params.id;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data: any = {};
    if (typeof parsed.data.name === 'string') data.name = parsed.data.name;
    if (typeof parsed.data.slug === 'string') data.slug = slugify(parsed.data.slug);
    if (typeof parsed.data.description !== 'undefined') data.description = parsed.data.description || '';
    if (typeof parsed.data.displayOrder === 'number') data.displayOrder = parsed.data.displayOrder;
    if (typeof parsed.data.parentId !== 'undefined') data.parentId = parsed.data.parentId || null;
    if (typeof parsed.data.imageUrl !== 'undefined') data.imageUrl = normalizeLocalPath(parsed.data.imageUrl || undefined) || null;
    if (typeof parsed.data.bannerUrl !== 'undefined') data.bannerUrl = normalizeLocalPath(parsed.data.bannerUrl || undefined) || null;
    if (typeof parsed.data.thumbnailUrl !== 'undefined') data.thumbnailUrl = normalizeLocalPath(parsed.data.thumbnailUrl || undefined) || null;
    if (typeof parsed.data.iconUrl !== 'undefined') data.iconUrl = normalizeLocalPath(parsed.data.iconUrl || undefined) || null;

    if (hasCategoryModel()) {
      // Only include columns that exist (guards when DB/client not yet migrated)
      const cols = await getCategoryColumns();
      const filtered: any = { ...data };
      if (!cols.has('imageurl')) delete filtered.imageUrl;
      if (!cols.has('bannerurl')) delete filtered.bannerUrl;
      if (!cols.has('thumbnailurl')) delete filtered.thumbnailUrl;
      if (!cols.has('iconurl')) delete filtered.iconUrl;

      try {
        const updated = await (prisma as any).category.update({ where: { id }, data: filtered });
        return NextResponse.json(updated);
      } catch (e: any) {
        const msg = String(e?.message || '')
        if (/Unknown arg .*imageUrl|Unknown arg .*bannerUrl|Unknown arg .*thumbnailUrl|Unknown arg .*iconUrl/i.test(msg)) {
          const fallback: any = { ...filtered };
          delete fallback.imageUrl; delete fallback.bannerUrl; delete fallback.thumbnailUrl; delete fallback.iconUrl;
          const updated = await (prisma as any).category.update({ where: { id }, data: fallback });
          return NextResponse.json(updated);
        }
        throw e;
      }
    } else {
      // Build raw SQL set clause
      const fields: string[] = [];
      const values: any[] = [];
      if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
      if (data.slug !== undefined) { fields.push('slug = ?'); values.push(data.slug); }
      if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
      if (data.displayOrder !== undefined) { fields.push('displayOrder = ?'); values.push(data.displayOrder); }
      if (data.parentId !== undefined) { fields.push('parentId = ?'); values.push(data.parentId); }
      if (data.imageUrl !== undefined) { fields.push('imageUrl = ?'); values.push(data.imageUrl); }
      if (data.bannerUrl !== undefined) { fields.push('bannerUrl = ?'); values.push(data.bannerUrl); }
      if (data.thumbnailUrl !== undefined) { fields.push('thumbnailUrl = ?'); values.push(data.thumbnailUrl); }
      if (data.iconUrl !== undefined) { fields.push('iconUrl = ?'); values.push(data.iconUrl); }
      fields.push('updatedAt = datetime(\'now\')');
      await prisma.$executeRawUnsafe(`UPDATE Category SET ${fields.join(', ')} WHERE id = ?`, ...values, id);
      const rows = await prisma.$queryRawUnsafe(`SELECT id, name, slug, description, displayOrder, parentId, imageUrl, bannerUrl, thumbnailUrl, iconUrl, createdAt FROM Category WHERE id = ?`, id) as any[];
      return NextResponse.json(rows[0] || { id, ...data });
    }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Slug مستخدم بالفعل' }, { status: 409 });
    }
    console.error('Categories PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get(getAdminCookieName())?.value || '';
    if (!verifyAdminJwt(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = params.id;
    if (hasCategoryModel()) {
      await (prisma as any).category.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    } else {
      await prisma.$executeRawUnsafe('DELETE FROM Category WHERE id = ?', id);
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error('Categories DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
