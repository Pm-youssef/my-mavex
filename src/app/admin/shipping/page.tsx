'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { toastError, toastSuccess, toastInfo, toastWarning } from '@/components/ui/Toast';
import { Truck, Save, RefreshCw, Plus, Trash2, Upload, Download, Calculator, CheckCircle2, Settings2, ChevronUp, ChevronDown, Zap } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

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

type Settings = {
  id: string;
  themePrimary?: string | null;
  shippingStandard: number;
  shippingExpress: number;
  freeShippingMin?: number | null;
  taxPercent?: number | null;
};

type ShippingMethod = {
  id: string; // e.g., 'STANDARD', 'EXPRESS', 'PICKUP'
  name: string;
  price: number;
  description?: string;
  enabled?: boolean;
};

export default function AdminShippingPage() {
  const { data, isLoading, error, mutate } = useSWR<Settings>('/api/admin/settings', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  });

  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [freeMin, setFreeMin] = useState<number | ''>('');
  const [tax, setTax] = useState<number | ''>('');
  const [calcSubtotal, setCalcSubtotal] = useState<number | ''>('');
  const [calcMethodId, setCalcMethodId] = useState<string>('STANDARD');
  const fileRef = useRef<HTMLInputElement>(null);

  const theme = useMemo(() => (data?.themePrimary || '#0c1420'), [data?.themePrimary]);
  const themeBorder = theme + '33';

  // Bootstrap methods from localStorage overrides OR fall back to settings
  useEffect(() => {
    // Try localStorage overrides
    try {
      const raw = localStorage.getItem('admin-shipping-methods');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          setMethods(arr);
        }
      }
    } catch {}
    if (data) {
      setMethods(prev => prev.length > 0 ? prev : [
        { id: 'STANDARD', name: 'شحن عادي', price: Number(data.shippingStandard || 0), enabled: true },
        { id: 'EXPRESS', name: 'شحن سريع', price: Number(data.shippingExpress || 0), enabled: true },
      ]);
      setFreeMin(data.freeShippingMin ?? '');
      setTax(data.taxPercent ?? '');
    }
  }, [data]);

  const addMethod = () => {
    const base = 'CUSTOM';
    let i = 1; let id = `${base}_${i}`;
    while (methods.some(m => m.id === id)) { i++; id = `${base}_${i}`; }
    setMethods(prev => [...prev, { id, name: 'طريقة جديدة', price: 0, enabled: true }]);
  };

  const moveMethod = (id: string, dir: 'up' | 'down') => {
    const idx = methods.findIndex(m => m.id === id);
    if (idx < 0) return;
    const swapWith = dir === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= methods.length) return;
    const next = methods.slice();
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    setMethods(next);
  };

  const updateMethod = (id: string, patch: Partial<ShippingMethod>) => {
    setMethods(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const removeMethod = (id: string) => {
    const core = ['STANDARD', 'EXPRESS'];
    if (core.includes(id)) {
      toastWarning({ title: 'لا يمكن الحذف', description: 'لا يمكنك حذف الطرق الأساسية، يمكنك تعطيلها فقط' });
      return;
    }
    setMethods(prev => prev.filter(m => m.id !== id));
    if (calcMethodId === id) setCalcMethodId('STANDARD');
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ methods, freeShippingMin: freeMin === '' ? null : freeMin, taxPercent: tax === '' ? null : tax }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'shipping-settings.json'; a.click(); URL.revokeObjectURL(url);
  };

  const importJSON = async (file: File) => {
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      if (!obj || typeof obj !== 'object') throw new Error('ملف غير صالح');
      if (Array.isArray(obj.methods)) setMethods(obj.methods);
      if (Object.prototype.hasOwnProperty.call(obj, 'freeShippingMin')) setFreeMin(obj.freeShippingMin ?? '');
      if (Object.prototype.hasOwnProperty.call(obj, 'taxPercent')) setTax(obj.taxPercent ?? '');
      toastSuccess({ title: 'تم الاستيراد', description: 'تم تحميل إعدادات الشحن' });
    } catch (e: any) {
      toastError({ title: 'فشل الاستيراد', description: e?.message || 'تعذر قراءة الملف' });
    } finally { if (fileRef.current) fileRef.current.value = ''; }
  };

  const saveToDatabase = async () => {
    try {
      const std = methods.find(m => m.id === 'STANDARD');
      const exp = methods.find(m => m.id === 'EXPRESS');
      const body: any = {
        shippingStandard: Number(std?.price ?? 0),
        shippingExpress: Number(exp?.price ?? 0),
        freeShippingMin: freeMin === '' ? null : Number(freeMin),
        taxPercent: tax === '' ? null : Number(tax),
      };
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'تعذّر الحفظ');
      toastSuccess({ title: 'تم الحفظ', description: 'تم حفظ إعدادات الشحن في القاعدة' });
      mutate();
    } catch (e: any) {
      toastError({ title: 'خطأ', description: e?.message || 'تعذّر حفظ الإعدادات' });
    }
  };

  const publishToStorefront = () => {
    try {
      const enabled = methods.filter(m => m.enabled ?? true).map(m => ({ id: m.id, name: m.name, price: Number(m.price), enabled: true }));
      localStorage.setItem('admin-shipping-methods', JSON.stringify(enabled));
      // Back-compat key
      const payload = {
        methods: enabled,
        freeShippingMin: freeMin === '' ? null : Number(freeMin),
        taxPercent: tax === '' ? null : Number(tax),
      } as any;
      localStorage.setItem('admin-shipping', JSON.stringify(payload));
      localStorage.setItem('admin-shipping-settings', JSON.stringify(payload));
      toastInfo({ title: 'تم النشر', description: 'تم نشر طرق الشحن للواجهة' });
    } catch (e: any) {
      toastError({ title: 'خطأ', description: e?.message || 'تعذّر النشر للواجهة' });
    }
  };

  // Calculator helpers
  const chosen = methods.find(m => m.id === calcMethodId) || methods[0];
  const calcShipping = (subtotal: number) => {
    const min = typeof freeMin === 'number' ? freeMin : (freeMin === '' ? null : Number(freeMin));
    if (min != null && subtotal >= Number(min)) return 0;
    return Number(chosen?.price || 0);
  };
  const calcTax = (subtotal: number) => {
    const t = typeof tax === 'number' ? tax : (tax === '' ? null : Number(tax));
    if (t == null) return 0;
    return Math.max(0, Math.round((subtotal * Number(t)) / 100));
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: themeBorder }}>
        <div className="p-6" style={{ background: theme }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-white/70 mb-1">لوحة الإدارة</div>
              <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2"><Truck className="w-6 h-6"/> الشحن والضرائب</h1>
              <p className="text-white/80 mt-1">تحكم كامل بطرق الشحن والحد المجاني ونسبة الضريبة مع حاسبة فورية</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={publishToStorefront} className="px-4 py-2 rounded-xl border-2 border-white/30 text-white hover:bg-white/10 font-bold inline-flex items-center gap-2"><Zap className="w-4 h-4"/> نشر للواجهة</button>
              <button onClick={saveToDatabase} className="px-4 py-2 rounded-xl bg-white text-black hover:bg-gray-100 font-bold inline-flex items-center gap-2"><Save className="w-4 h-4"/> حفظ</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Methods */}
        <section className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4 text-[#0c1420]">
            <div className="flex items-center gap-2"><Settings2 className="w-5 h-5"/><h2 className="text-lg font-extrabold">طرق الشحن</h2></div>
            <div className="flex items-center gap-2">
              <button onClick={addMethod} className="px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 font-bold text-[#0c1420] inline-flex items-center gap-2"><Plus className="w-4 h-4"/> إضافة طريقة</button>
              <button onClick={() => { setMethods([
                { id:'STANDARD', name:'شحن عادي', price:75, enabled:true },
                { id:'EXPRESS', name:'شحن سريع', price:150, enabled:true },
                { id:'PICKUP', name:'إستلام من المتجر', price:0, enabled:true },
              ]); setFreeMin(''); setTax(''); toastInfo({ title:'تم تطبيق القيم القياسية', description:'أسعار مناسبة للسوق المحلي' }) }} className="px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 font-bold text-[#0c1420]">تعيين قياسي</button>
            </div>
          </div>
          <div className="space-y-3">
            {methods.map((m, idx) => (
              <div key={m.id} className="grid grid-cols-1 md:grid-cols-[1fr_160px_120px_1fr] items-center gap-3 border-2 border-gray-200 rounded-xl px-4 py-3">
                <input className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={m.name} onChange={e=>updateMethod(m.id,{ name:e.target.value })} />
                <input type="number" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={m.price} onChange={e=>updateMethod(m.id,{ price: Number(e.target.value || 0) })} />
                <label className="flex items-center justify-between gap-2 border-2 border-gray-200 rounded-xl px-3 py-2">
                  <span className="text-sm">مفعّل</span>
                  <input type="checkbox" checked={m.enabled ?? true} onChange={e=>updateMethod(m.id,{ enabled: e.target.checked })} />
                </label>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => moveMethod(m.id,'up')} className="px-2 py-2 rounded-lg border-2 border-gray-200 hover:border-brand-500"><ChevronUp className="w-4 h-4"/></button>
                  <button onClick={() => moveMethod(m.id,'down')} className="px-2 py-2 rounded-lg border-2 border-gray-200 hover:border-brand-500"><ChevronDown className="w-4 h-4"/></button>
                  <button onClick={() => removeMethod(m.id)} className="px-3 py-2 rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-1"><Trash2 className="w-4 h-4"/> حذف</button>
                </div>
              </div>
            ))}
            {methods.length === 0 && (
              <div className="text-center text-gray-500 py-6">لا توجد طرق. أضف طريقة جديدة</div>
            )}
          </div>
        </section>

        {/* Free / Tax / Import-Export */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="text-[#0c1420] font-extrabold mb-2">خيارات عامة</div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-bold mb-1 text-[#0c1420]">الشحن المجاني من</label>
              <input type="number" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={freeMin === '' ? '' : freeMin} onChange={e=>setFreeMin(e.target.value === '' ? '' : Number(e.target.value))} placeholder="مثال: 1500" />
              <p className="text-xs text-gray-500 mt-1">اتركه فارغًا لتعطيل الشحن المجاني</p>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-[#0c1420]">نسبة الضريبة (%)</label>
              <input type="number" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={tax === '' ? '' : tax} onChange={e=>setTax(e.target.value === '' ? '' : Number(e.target.value))} placeholder="مثال: 14" />
              <p className="text-xs text-gray-500 mt-1">اتركه فارغًا لتعطيل الضريبة</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-3">
            <div className="text-[#0c1420] font-extrabold">استيراد/تصدير</div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={exportJSON} className="px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 font-bold text-[#0c1420] inline-flex items-center gap-2"><Download className="w-4 h-4"/> تصدير</button>
              <button onClick={()=>fileRef.current?.click()} className="px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 font-bold text-[#0c1420] inline-flex items-center gap-2"><Upload className="w-4 h-4"/> استيراد</button>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={e=>{ const f = e.target.files?.[0]; if (f) importJSON(f); }} />
            </div>
          </div>
        </section>
      </div>

      {/* Calculator */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4 text-[#0c1420]"><Calculator className="w-5 h-5"/> <h2 className="text-lg font-extrabold">حاسبة سريعة</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-bold mb-1 text-[#0c1420]">المجموع الفرعي</label>
            <input type="number" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={calcSubtotal === '' ? '' : calcSubtotal} onChange={e=>setCalcSubtotal(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-[#0c1420]">طريقة الشحن</label>
            <select className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={calcMethodId} onChange={e=>setCalcMethodId(e.target.value)}>
              {methods.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
        {calcSubtotal !== '' && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-xl border-2 border-gray-200 p-4">
              <div className="text-xs text-gray-500">الشحن</div>
              <div className="text-xl font-extrabold text-[#0c1420]">{formatPrice(calcShipping(Number(calcSubtotal)))}</div>
            </div>
            <div className="rounded-xl border-2 border-gray-200 p-4">
              <div className="text-xs text-gray-500">الضريبة</div>
              <div className="text-xl font-extrabold text-[#0c1420]">{formatPrice(calcTax(Number(calcSubtotal)))}</div>
            </div>
            <div className="rounded-xl border-2 border-gray-200 p-4">
              <div className="text-xs text-gray-500">الإجمالي</div>
              <div className="text-xl font-extrabold text-[#0c1420]">{formatPrice(Number(calcSubtotal) + calcShipping(Number(calcSubtotal)) + calcTax(Number(calcSubtotal)))}</div>
            </div>
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600"/>
              <div className="text-sm text-emerald-700">الحساب فوري وفق الحد المجاني والضريبة</div>
            </div>
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button onClick={() => { setMethods([
          { id:'STANDARD', name:'شحن عادي', price:75, enabled:true },
          { id:'EXPRESS', name:'شحن سريع', price:150, enabled:true },
        ]); setFreeMin(''); setTax(''); }} className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 font-bold text-[#0c1420] inline-flex items-center gap-2"><RefreshCw className="w-4 h-4"/> إعادة تعيين</button>
        <button onClick={publishToStorefront} className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 font-bold text-[#0c1420] inline-flex items-center gap-2"><Zap className="w-4 h-4"/> نشر للواجهة</button>
        <button onClick={saveToDatabase} className="px-4 py-2 rounded-xl text-white font-bold" style={{ background: theme }}><Save className="inline w-4 h-4 mr-1"/> حفظ</button>
      </div>
    </div>
  );
}
