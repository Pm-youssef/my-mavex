'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { Save, RefreshCw, Paintbrush, Globe, Package, ShieldCheck, WalletCards, ImageIcon, Link as LinkIcon, Wrench, Megaphone, Upload, Download, Clock } from 'lucide-react';
import { toastError, toastSuccess } from '@/components/ui/Toast';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch {}
    const err: any = new Error(body?.error || 'Failed to load');
    err.status = res.status;
    throw err;
  }
  return res.json();
};

export default function AdminSettingsPage() {
  type Settings = {
    id: string;
    storeName: string;
    storeEmail?: string | null;
    phone?: string | null;
    address?: string | null;
    currency: string;
    currencySymbol?: string | null;
    currencyPosition?: 'left' | 'right' | string | null;
    shippingStandard: number;
    shippingExpress: number;
    freeShippingMin?: number | null;
    taxPercent?: number | null;
    enableReviews: boolean;
    enableCoupons: boolean;
    enableWishlist: boolean;
    themePrimary?: string | null;
    heroBannerUrl?: string | null;
    // Social
    facebookUrl?: string | null;
    instagramUrl?: string | null;
    tiktokUrl?: string | null;
    twitterUrl?: string | null;
    youtubeUrl?: string | null;
    whatsappNumber?: string | null;
    whatsappEnabled?: boolean;
    // Policies
    privacyPolicyUrl?: string | null;
    termsUrl?: string | null;
    returnPolicy?: string | null;
    // Maintenance
    siteOnline?: boolean;
    maintenanceMsg?: string | null;
    // Locale & SEO
    locale?: string | null;
    timeZone?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    ogImageUrl?: string | null;
    // Promo bar
    promoEnabled?: boolean;
    promoText?: string | null;
    promoLink?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };

  const { data, isLoading, error, mutate } = useSWR<Settings>('/api/admin/settings', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  });

  const [form, setForm] = useState<Partial<Settings>>({});
  const theme = useMemo(() => (form.themePrimary || data?.themePrimary || '#0c1420'), [form.themePrimary, data?.themePrimary]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const onChange = (patch: Partial<Settings>) => setForm(prev => ({ ...prev, ...patch }));

  const validate = () => {
    const name = (form.storeName || '').toString().trim();
    if (!name) return 'اسم المتجر مطلوب';
    const currency = (form.currency || '').toString().trim();
    if (!currency) return 'العملة مطلوبة';
    const ss = Number(form.shippingStandard);
    const se = Number(form.shippingExpress);
    if (!Number.isFinite(ss) || ss < 0) return 'تكلفة الشحن العادي غير صالحة';
    if (!Number.isFinite(se) || se < 0) return 'تكلفة الشحن السريع غير صالحة';
    if (form.freeShippingMin != null && form.freeShippingMin !== undefined) {
      const fm = Number(form.freeShippingMin);
      if (!Number.isFinite(fm) || fm < 0) return 'حد الشحن المجاني غير صالح';
    }
    if (form.taxPercent != null && form.taxPercent !== undefined) {
      const tp = Number(form.taxPercent);
      if (!Number.isFinite(tp) || tp < 0 || tp > 100) return 'الضريبة يجب أن تكون بين 0 و 100';
    }
    if (form.themePrimary) {
      const s = String(form.themePrimary).trim();
      if (!/^#?[0-9a-fA-F]{6}$/.test(s)) return 'لون العلامة يجب أن يكون بصيغة HEX مثل #0c1420';
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { toastError({ title: 'تحقق', description: err }); return; }
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'فشل حفظ الإعدادات');
      }
      toastSuccess({ title: 'تم الحفظ', description: 'تم تحديث الإعدادات بنجاح' });
      mutate();
    } catch (e: any) {
      toastError({ title: 'خطأ', description: e?.message || 'تعذّر حفظ الإعدادات' });
    }
  };

  const resetToServer = () => { if (data) setForm(data); };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(form, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'site-settings.json'; a.click(); URL.revokeObjectURL(url);
  };

  const importJSON = async (file: File) => {
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      if (typeof obj !== 'object' || obj === null) throw new Error('ملف غير صالح');
      setForm(prev => ({ ...prev, ...obj }));
      toastSuccess({ title: 'تم الاستيراد', description: 'تم تحميل الإعدادات من الملف' });
    } catch (e: any) {
      toastError({ title: 'فشل الاستيراد', description: e?.message || 'تعذر قراءة الملف' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Brand hero (dark) */}
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: theme + '33' }}>
        <div className="p-6" style={{ background: theme }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-white/70 mb-1">لوحة الإدارة</div>
              <h1 className="text-2xl md:text-3xl font-black text-white">الإعدادات العامة</h1>
              <p className="text-white/80 mt-1">إدارة إعدادات المتجر والمظهر والخصائص</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetToServer}
                className="px-4 py-2 rounded-xl border-2 border-white/30 text-white hover:bg-white/10 font-bold inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> إعادة تعيين
              </button>
              <button
                onClick={save}
                className="px-4 py-2 rounded-xl bg-white text-black hover:bg-gray-100 font-bold inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> حفظ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Store info */}
        <section className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4 text-[#0c1420]">
            <Globe className="w-5 h-5" />
            <h2 className="text-lg font-extrabold">بيانات المتجر</h2>
          </div>
          {isLoading ? (
            <div className="text-gray-600">جاري التحميل...</div>
          ) : error ? (
            <div className="text-red-600">تعذّر تحميل الإعدادات — تأكد من تسجيل الدخول كمسؤول ومن تهيئة قاعدة البيانات (npm run db:push)</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-[#0c1420]">اسم المتجر</label>
                <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={form.storeName || ''} onChange={e => onChange({ storeName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-[#0c1420]">البريد الإلكتروني</label>
                <input type="email" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={form.storeEmail || ''} onChange={e => onChange({ storeEmail: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-[#0c1420]">الهاتف</label>
                <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={form.phone || ''} onChange={e => onChange({ phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-[#0c1420]">العنوان</label>
                <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={form.address || ''} onChange={e => onChange({ address: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-[#0c1420]">العملة</label>
                <div className="grid grid-cols-2 gap-3">
                  <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={form.currency || ''} onChange={e => onChange({ currency: e.target.value })} placeholder="EGP" />
                  <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={form.currencySymbol || ''} onChange={e => onChange({ currencySymbol: e.target.value })} placeholder="E£" />
                  <select className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={form.currencyPosition || 'right'} onChange={e => onChange({ currencyPosition: e.target.value as any })}>
                    <option value="left">يسار (E£ 100)</option>
                    <option value="right">يمين (100 E£)</option>
                  </select>
                  <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={form.locale || ''} onChange={e => onChange({ locale: e.target.value })} placeholder="ar-EG" />
                  <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={form.timeZone || ''} onChange={e => onChange({ timeZone: e.target.value })} placeholder="Africa/Cairo" />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Theme */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4 text-[#0c1420]">
            <Paintbrush className="w-5 h-5" />
            <h2 className="text-lg font-extrabold">العلامة والمظهر</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-[#0c1420]">اللون الأساسي (HEX)</label>
              <div className="flex items-center gap-3">
                <input className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" placeholder="#0c1420" value={form.themePrimary || ''} onChange={e => onChange({ themePrimary: e.target.value })} />
                <input type="color" className="w-12 h-10 border-2 border-gray-200 rounded-lg" value={(theme.startsWith('#') ? theme : `#${theme}`)} onChange={e => onChange({ themePrimary: e.target.value })} />
              </div>
              <p className="text-xs text-gray-500 mt-1">نوصي باستخدام لون داكن لصفحات الأدمن.</p>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-[#0c1420]">صورة البانر (URL)</label>
              <div className="flex items-center gap-3">
                <input className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" placeholder="https://..." value={form.heroBannerUrl || ''} onChange={e => onChange({ heroBannerUrl: e.target.value })} />
                <ImageIcon className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <div className="p-4" style={{ background: theme }}>
                <div className="text-white font-extrabold">معاينة الترويسة الداكنة</div>
                <p className="text-white/80 text-sm">هكذا ستبدو بطاقات العناوين الداكنة داخل لوحة الإدارة</p>
              </div>
              <div className="p-4 bg-white">محتوى تجريبي</div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Social & Contact */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4 text-[#0c1420]"><LinkIcon className="w-5 h-5"/> <h2 className="text-lg font-extrabold">السوشيال وواتساب</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="border-2 border-gray-200 rounded-xl px-4 py-2" placeholder="Facebook URL" value={form.facebookUrl || ''} onChange={e=>onChange({ facebookUrl: e.target.value })} />
            <input className="border-2 border-gray-200 rounded-xl px-4 py-2" placeholder="Instagram URL" value={form.instagramUrl || ''} onChange={e=>onChange({ instagramUrl: e.target.value })} />
            <input className="border-2 border-gray-200 rounded-xl px-4 py-2" placeholder="TikTok URL" value={form.tiktokUrl || ''} onChange={e=>onChange({ tiktokUrl: e.target.value })} />
            <input className="border-2 border-gray-200 rounded-xl px-4 py-2" placeholder="Twitter/X URL" value={form.twitterUrl || ''} onChange={e=>onChange({ twitterUrl: e.target.value })} />
            <input className="border-2 border-gray-200 rounded-xl px-4 py-2" placeholder="YouTube URL" value={form.youtubeUrl || ''} onChange={e=>onChange({ youtubeUrl: e.target.value })} />
            <div className="flex items-center gap-3">
              <input className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2" placeholder="رقم واتساب" value={form.whatsappNumber || ''} onChange={e=>onChange({ whatsappNumber: e.target.value })} />
              <label className="inline-flex items-center gap-2 border-2 border-gray-200 rounded-xl px-3 py-2">
                <input type="checkbox" checked={!!form.whatsappEnabled} onChange={e=>onChange({ whatsappEnabled: e.target.checked })} /> تفعيل
              </label>
            </div>
          </div>
        </section>

        {/* Shipping & taxes */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4 text-[#0c1420]">
            <Package className="w-5 h-5" />
            <h2 className="text-lg font-extrabold">الشحن والضرائب</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-[#0c1420]">شحن عادي (EGP)</label>
              <input type="number" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={form.shippingStandard ?? 0} onChange={e => onChange({ shippingStandard: Number(e.target.value || 0) })} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-[#0c1420]">شحن سريع (EGP)</label>
              <input type="number" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={form.shippingExpress ?? 0} onChange={e => onChange({ shippingExpress: Number(e.target.value || 0) })} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-[#0c1420]">الشحن المجاني ابتداءً من (اختياري)</label>
              <input type="number" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={form.freeShippingMin ?? ''} onChange={e => onChange({ freeShippingMin: e.target.value === '' ? null : Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-[#0c1420]">الضريبة (%) (اختياري)</label>
              <input type="number" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={form.taxPercent ?? ''} onChange={e => onChange({ taxPercent: e.target.value === '' ? null : Number(e.target.value) })} />
            </div>
          </div>
        </section>

        {/* Features toggles */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4 text-[#0c1420]">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="text-lg font-extrabold">الخصائص</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 border-2 border-gray-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2"><WalletCards className="w-4 h-4 text-gray-500"/> تفعيل الكوبونات</div>
              <input type="checkbox" checked={!!form.enableCoupons} onChange={e => onChange({ enableCoupons: e.target.checked })} />
            </label>
            <label className="flex items-center justify-between gap-3 border-2 border-gray-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gray-500"/> تفعيل المراجعات</div>
              <input type="checkbox" checked={!!form.enableReviews} onChange={e => onChange({ enableReviews: e.target.checked })} />
            </label>
            <label className="flex items-center justify-between gap-3 border-2 border-gray-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gray-500"/> تفعيل المفضلة (Wishlist)</div>
              <input type="checkbox" checked={!!form.enableWishlist} onChange={e => onChange({ enableWishlist: e.target.checked })} />
            </label>
          </div>
        </section>

        {/* Policies */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4 text-[#0c1420]"><LinkIcon className="w-5 h-5"/> <h2 className="text-lg font-extrabold">الروابط والسياسات</h2></div>
          <div className="space-y-3">
            <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2" placeholder="رابط سياسة الخصوصية" value={form.privacyPolicyUrl || ''} onChange={e=>onChange({ privacyPolicyUrl: e.target.value })} />
            <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2" placeholder="رابط الشروط والأحكام" value={form.termsUrl || ''} onChange={e=>onChange({ termsUrl: e.target.value })} />
            <textarea rows={4} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2" placeholder="سياسة الإرجاع" value={form.returnPolicy || ''} onChange={e=>onChange({ returnPolicy: e.target.value })}></textarea>
          </div>
        </section>

        {/* Maintenance */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4 text-[#0c1420]"><Wrench className="w-5 h-5"/> <h2 className="text-lg font-extrabold">الصيانة</h2></div>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 border-2 border-gray-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500"/> الموقع أونلاين</div>
              <input type="checkbox" checked={form.siteOnline !== false} onChange={e=>onChange({ siteOnline: e.target.checked })} />
            </label>
            <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2" placeholder="رسالة الصيانة" value={form.maintenanceMsg || ''} onChange={e=>onChange({ maintenanceMsg: e.target.value })} />
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <div className="p-3 text-white" style={{ background: theme }}>
                {form.siteOnline === false ? (form.maintenanceMsg || 'الموقع قيد الصيانة، نعود قريباً') : 'الموقع أونلاين'}
              </div>
            </div>
          </div>
        </section>

        {/* SEO */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4 text-[#0c1420]"><Globe className="w-5 h-5"/> <h2 className="text-lg font-extrabold">SEO</h2></div>
          <div className="space-y-3">
            <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2" placeholder="Meta Title" value={form.metaTitle || ''} onChange={e=>onChange({ metaTitle: e.target.value })} />
            <textarea rows={3} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2" placeholder="Meta Description" value={form.metaDescription || ''} onChange={e=>onChange({ metaDescription: e.target.value })}></textarea>
            <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2" placeholder="OG Image URL" value={form.ogImageUrl || ''} onChange={e=>onChange({ ogImageUrl: e.target.value })} />
          </div>
        </section>

        {/* Promo bar */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4 text-[#0c1420]"><Megaphone className="w-5 h-5"/> <h2 className="text-lg font-extrabold">شريط العروض</h2></div>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 border-2 border-gray-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2"><Megaphone className="w-4 h-4 text-gray-500"/> تفعيل</div>
              <input type="checkbox" checked={!!form.promoEnabled} onChange={e=>onChange({ promoEnabled: e.target.checked })} />
            </label>
            <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2" placeholder="نص العرض" value={form.promoText || ''} onChange={e=>onChange({ promoText: e.target.value })} />
            <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2" placeholder="رابط العرض (اختياري)" value={form.promoLink || ''} onChange={e=>onChange({ promoLink: e.target.value })} />
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <div className="p-3 text-white text-sm text-center" style={{ background: theme }}>
                {form.promoEnabled ? (form.promoText || 'عرض خاص الآن!') : '— معطّل —'}
              </div>
            </div>
          </div>
        </section>

        {/* Save / Backup */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-[#0c1420] font-extrabold mb-2">حفظ ونسخ احتياطي</div>
          <p className="text-gray-600 mb-4">احفظ التغييرات أو قم بتصدير/استيراد إعداداتك كملف JSON.</p>
          <div className="flex flex-col gap-3">
            <button onClick={save} className="px-4 py-2 rounded-xl text-white font-bold" style={{ background: theme }}><Save className="inline w-4 h-4 mr-1"/> حفظ</button>
            <button onClick={resetToServer} className="px-4 py-2 rounded-xl border-2 border-gray-200 text-[#0c1420] hover:bg-gray-50"><RefreshCw className="inline w-4 h-4 mr-1"/> إلغاء التغييرات</button>
            <div className="flex gap-2">
              <button onClick={exportJSON} className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] font-bold inline-flex items-center gap-2"><Download className="w-4 h-4"/> تصدير JSON</button>
              <button onClick={()=>fileRef.current?.click()} className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] font-bold inline-flex items-center gap-2"><Upload className="w-4 h-4"/> استيراد JSON</button>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e)=>{ const file=e.target.files?.[0]; if(file) importJSON(file); }} />
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-4">تنبيه: قد تحتاج لتحديث قاعدة البيانات لتفعيل كل الحقول الجديدة (npm run db:push).</div>
        </section>
      </div>
    </div>
  );
}
