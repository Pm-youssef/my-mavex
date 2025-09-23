import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function hasSettingsModel(): boolean {
  const anyPrisma = prisma as any;
  return !!anyPrisma?.siteSettings && typeof anyPrisma.siteSettings.findUnique === 'function';
}

const DEFAULT_PUBLIC = {
  id: 'default',
  storeName: 'T-Shirt Store',
  currency: 'EGP',
  currencySymbol: 'E£',
  currencyPosition: 'right',
  shippingStandard: 75,
  shippingExpress: 150,
  freeShippingMin: null as number | null,
  taxPercent: null as number | null,
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
  // Legal/SEO/Promo
  privacyPolicyUrl: '',
  termsUrl: '',
  returnPolicy: '',
  siteOnline: true,
  maintenanceMsg: 'الموقع قيد الصيانة، نعود قريباً',
  locale: 'ar-EG',
  timeZone: 'Africa/Cairo',
  metaTitle: 'T-Shirt Store',
  metaDescription: 'أفضل متجر تيشرتات',
  ogImageUrl: '',
  promoEnabled: false,
  promoText: '',
  promoLink: '',
} as const;

export async function GET() {
  try {
    if (!hasSettingsModel()) {
      return NextResponse.json(DEFAULT_PUBLIC);
    }
    const s = await (prisma as any).siteSettings.findUnique({ where: { id: 'default' } });
    if (!s) return NextResponse.json(DEFAULT_PUBLIC);
    // Whitelist public fields only
    const {
      id, storeName, currency, currencySymbol, currencyPosition,
      shippingStandard, shippingExpress, freeShippingMin, taxPercent,
      themePrimary, heroBannerUrl,
      facebookUrl, instagramUrl, tiktokUrl, twitterUrl, youtubeUrl, whatsappNumber, whatsappEnabled,
      privacyPolicyUrl, termsUrl, returnPolicy,
      siteOnline, maintenanceMsg,
      locale, timeZone, metaTitle, metaDescription, ogImageUrl,
      promoEnabled, promoText, promoLink,
    } = s as any;

    return NextResponse.json({
      id, storeName, currency, currencySymbol, currencyPosition,
      shippingStandard, shippingExpress, freeShippingMin, taxPercent,
      themePrimary, heroBannerUrl,
      facebookUrl, instagramUrl, tiktokUrl, twitterUrl, youtubeUrl, whatsappNumber, whatsappEnabled,
      privacyPolicyUrl, termsUrl, returnPolicy,
      siteOnline, maintenanceMsg,
      locale, timeZone, metaTitle, metaDescription, ogImageUrl,
      promoEnabled, promoText, promoLink,
    });
  } catch (e) {
    return NextResponse.json(DEFAULT_PUBLIC);
  }
}
