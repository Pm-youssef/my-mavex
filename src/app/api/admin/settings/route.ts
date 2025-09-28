import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getAdminCookieName, verifyAdminJwt } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function hasSettingsModel(): boolean {
  const anyPrisma = prisma as any;
  return !!anyPrisma?.siteSettings && typeof anyPrisma.siteSettings.findUnique === 'function';
}

const DEFAULT_SETTINGS = {
  id: 'default',
  storeName: 'T-Shirt Store',
  storeEmail: '',
  phone: '',
  address: '',
  currency: 'EGP',
  currencySymbol: 'E£',
  currencyPosition: 'right',
  shippingStandard: 75,
  shippingExpress: 150,
  freeShippingMin: null as number | null,
  taxPercent: null as number | null,
  enableReviews: true,
  enableCoupons: true,
  enableWishlist: true,
  themePrimary: '#0c1420',
  heroBannerUrl: '',

  // Social
  facebookUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  twitterUrl: '',
  youtubeUrl: '',
  whatsappNumber: '',
  whatsappEnabled: false,

  // Policies & legal
  privacyPolicyUrl: '',
  termsUrl: '',
  returnPolicy: '',

  // Maintenance
  siteOnline: true,
  maintenanceMsg: 'الموقع قيد الصيانة، نعود قريباً',

  // Locale & SEO
  locale: 'ar-EG',
  timeZone: 'Africa/Cairo',
  metaTitle: 'T-Shirt Store',
  metaDescription: 'أفضل متجر تيشرتات',
  ogImageUrl: '',

  // Promo bar
  promoEnabled: false,
  promoText: '',
  promoLink: '',
} as const;

export async function GET() {
  try {
    const token = cookies().get(getAdminCookieName())?.value || '';
    if (!verifyAdminJwt(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasSettingsModel()) {
      // Return ephemeral defaults until DB is migrated
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    const current = await (prisma as any).siteSettings.findUnique({ where: { id: 'default' } });
    if (current) return NextResponse.json(current);

    const created = await (prisma as any).siteSettings.create({ data: DEFAULT_SETTINGS });
    return NextResponse.json(created);
  } catch (error: any) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = cookies().get(getAdminCookieName())?.value || '';
    if (!verifyAdminJwt(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!hasSettingsModel()) {
      return NextResponse.json({ error: 'Settings model not ready. Please run: npm run db:push' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const payload: any = {};
    const keys = [
      'storeName', 'storeEmail', 'phone', 'address', 'currency', 'currencySymbol', 'currencyPosition',
      'shippingStandard', 'shippingExpress', 'freeShippingMin', 'taxPercent',
      'enableReviews', 'enableCoupons', 'enableWishlist',
      'themePrimary', 'heroBannerUrl',
      'facebookUrl', 'instagramUrl', 'tiktokUrl', 'twitterUrl', 'youtubeUrl', 'whatsappNumber', 'whatsappEnabled',
      'privacyPolicyUrl', 'termsUrl', 'returnPolicy',
      'siteOnline', 'maintenanceMsg',
      'locale', 'timeZone', 'metaTitle', 'metaDescription', 'ogImageUrl',
      'promoEnabled', 'promoText', 'promoLink',
    ] as const;

    for (const k of keys) {
      if (k in body) payload[k] = body[k];
    }

    if (payload.themePrimary) {
      const s = String(payload.themePrimary).trim();
      if (!/^#?[0-9a-fA-F]{6}$/.test(s)) {
        return NextResponse.json({ error: 'themePrimary must be a hex color like #0c1420' }, { status: 400 });
      }
      payload.themePrimary = s.startsWith('#') ? s : `#${s}`;
    }

    if (payload.currencyPosition) {
      const pos = String(payload.currencyPosition);
      if (!['left','right'].includes(pos)) {
        return NextResponse.json({ error: 'currencyPosition must be left or right' }, { status: 400 });
      }
      payload.currencyPosition = pos;
    }

    if ('shippingStandard' in payload && !(Number.isFinite(Number(payload.shippingStandard)))) {
      return NextResponse.json({ error: 'shippingStandard must be a number' }, { status: 400 });
    }
    if ('shippingExpress' in payload && !(Number.isFinite(Number(payload.shippingExpress)))) {
      return NextResponse.json({ error: 'shippingExpress must be a number' }, { status: 400 });
    }
    if ('freeShippingMin' in payload && payload.freeShippingMin != null && !(Number.isFinite(Number(payload.freeShippingMin)))) {
      return NextResponse.json({ error: 'freeShippingMin must be a number or null' }, { status: 400 });
    }
    if ('taxPercent' in payload && payload.taxPercent != null && !(Number.isFinite(Number(payload.taxPercent)))) {
      return NextResponse.json({ error: 'taxPercent must be a number or null' }, { status: 400 });
    }

    // Coerce numbers
    ['shippingStandard','shippingExpress','freeShippingMin','taxPercent'].forEach((n) => {
      if (n in payload) {
        payload[n] = payload[n] == null ? null : Number(payload[n]);
      }
    });

    const updated = await (prisma as any).siteSettings.upsert({
      where: { id: 'default' },
      update: payload,
      create: { ...DEFAULT_SETTINGS, ...payload },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Settings PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
