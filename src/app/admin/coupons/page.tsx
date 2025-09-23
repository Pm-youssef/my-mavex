'use client';

import useSWR from 'swr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Plus, Trash2, Download, Upload, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Check, Copy, Filter, FlaskConical, Sparkles } from 'lucide-react';
import { mutate } from 'swr';
import { toastError, toastSuccess } from '@/components/ui/Toast';

type Coupon = {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minSubtotal?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  startsAt?: string | null;
  endsAt?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

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

type SortKey = 'created' | 'code' | 'value' | 'usage' | 'active';

export default function CouponsPage() {
  // Fetch
  const { data = [], isLoading, error } = useSWR<Coupon[]>('/api/coupons', fetcher, {
    refreshInterval: 20000,
    revalidateOnFocus: true
  });

  // Form state
  const [code, setCode] = useState('');
  const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [value, setValue] = useState<number | ''>('');
  const [minSubtotal, setMinSubtotal] = useState<number | ''>('');
  const [usageLimit, setUsageLimit] = useState<number | ''>('');
  const [startsAt, setStartsAt] = useState<string>('');
  const [endsAt, setEndsAt] = useState<string>('');
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search / sort / pagination
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('created');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const searchRef = useRef<HTMLInputElement>(null);
  const [filterActive, setFilterActive] = useState<'all'|'active'|'inactive'>('all');
  const [filterType, setFilterType] = useState<'all'|'PERCENT'|'FIXED'>('all');

  // Tester panel state
  const [testerOpen, setTesterOpen] = useState(false);
  const [testerCode, setTesterCode] = useState('');
  const [testerSubtotal, setTesterSubtotal] = useState<number | ''>('');
  const [testerLoading, setTesterLoading] = useState(false);
  const [testerResult, setTesterResult] = useState<{ valid: boolean; discount?: number; total?: number; reason?: string } | null>(null);

  // CSV import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const filtered = useMemo(() => {
    const src: any[] = Array.isArray(data) ? (data as any[]) : [];
    const list = src.filter((c: any) => {
      const term = q.trim().toLowerCase();
      const matchesTerm = !term || c.code.toLowerCase().includes(term) || c.type.toLowerCase().includes(term);
      const matchesActive = filterActive === 'all' || (filterActive === 'active' ? !!c.active : !c.active);
      const matchesType = filterType === 'all' || c.type === filterType;
      return matchesTerm && matchesActive && matchesType;
    });

    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'created') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'code') {
        cmp = a.code.localeCompare(b.code, 'ar');
      } else if (sortBy === 'value') {
        cmp = a.value - b.value;
      } else if (sortBy === 'usage') {
        const au = a.usageCount - (a.usageLimit ?? 0);
        const bu = b.usageCount - (b.usageLimit ?? 0);
        cmp = au - bu;
      } else if (sortBy === 'active') {
        cmp = Number(a.active) - Number(b.active);
      }
      return dir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [data, q, sortBy, dir, filterActive, filterType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const changeSort = (k: SortKey) => {
    if (sortBy === k) setDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(k);
      setDir('asc');
    }
  };

  // Create
  const createCoupon = async () => {
    if (!code.trim()) return toastError({ title: 'تحقق', description: 'يرجى إدخال كود الكوبون' });
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) return toastError({ title: 'تحقق', description: 'قيمة الخصم غير صالحة' });
    if (type === 'PERCENT' && (v <= 0 || v > 100)) return toastError({ title: 'تحقق', description: 'النسبة يجب أن تكون بين 1 و 100' });

    setIsSubmitting(true);
    try {
      const body: any = {
        code: code.trim().toUpperCase(),
        type,
        value: v,
        active
      };
      if (minSubtotal !== '') body.minSubtotal = Number(minSubtotal);
      if (usageLimit !== '') body.usageLimit = Number(usageLimit);
      if (startsAt) body.startsAt = new Date(startsAt).toISOString();
      if (endsAt) body.endsAt = new Date(endsAt).toISOString();

      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'فشل إنشاء الكوبون');
      }
      toastSuccess({ title: 'تم الإنشاء', description: 'تم إنشاء الكوبون بنجاح' });
      // reset minimal fields
      setCode('');
      setValue('');
      setMinSubtotal('');
      setUsageLimit('');
      setStartsAt('');
      setEndsAt('');
      setActive(true);
      mutate('/api/coupons');
    } catch (e: any) {
      toastError({ title: 'خطأ', description: e?.message || 'فشل إنشاء الكوبون' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active
  const toggleActive = async (c: Coupon) => {
    try {
      const res = await fetch(`/api/coupons/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !c.active })
      });
      if (!res.ok) throw new Error('فشل التعديل');
      toastSuccess({ title: 'تم التحديث', description: `الكوبون ${!c.active ? 'مُفعل' : 'مُعطل'}` });
      mutate('/api/coupons');
    } catch {
      toastError({ title: 'خطأ', description: 'تعذّر تحديث الحالة' });
    }
  };

  // Delete
  const deleteCoupon = async (id: string) => {
    if (!confirm('حذف الكوبون؟')) return;
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل الحذف');
      toastSuccess({ title: 'تم الحذف', description: 'تم حذف الكوبون' });
      mutate('/api/coupons');
    } catch {
      toastError({ title: 'خطأ', description: 'تعذّر حذف الكوبون' });
    }
  };

  // Export helpers
  const toCSV = (rows: Coupon[]) => {
    const headers = ['الكود', 'النوع', 'القيمة', 'حد أدنى', 'حد الاستخدام', 'المستخدم', 'فعّال', 'يبدأ', 'ينتهي', 'أُنشئ'];
    const lines = rows.map(r => [
      JSON.stringify(r.code ?? ''),
      JSON.stringify(r.type ?? ''),
      r.value ?? 0,
      r.minSubtotal ?? '',
      r.usageLimit ?? '',
      r.usageCount ?? 0,
      r.active ? 'نعم' : 'لا',
      r.startsAt ? new Date(r.startsAt).toLocaleString('ar-EG') : '',
      r.endsAt ? new Date(r.endsAt).toLocaleString('ar-EG') : '',
      r.createdAt ? new Date(r.createdAt).toLocaleString('ar-EG') : ''
    ].join(','));
    return [headers.join(','), ...lines].join('\n');
  };

  const downloadBlob = (content: string, mime: string, filename: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = useCallback(() => {
    downloadBlob(toCSV(filtered), 'text/csv;charset=utf-8;', `coupons-${Date.now()}.csv`);
  }, [filtered]);

  const exportJSON = useCallback(() => {
    downloadBlob(JSON.stringify(filtered, null, 2), 'application/json', `coupons-${Date.now()}.json`);
  }, [filtered]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'f') searchRef.current?.focus();
      else if (k === 'e') exportCSV();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exportCSV]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32">
        <div className="mavex-container">
          <div className="text-center py-20">
            <div className="mavex-loading h-32 w-32 mx-auto"></div>
            <p className="mt-8 text-gray-600 text-xl font-medium">جاري تحميل الكوبونات...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32">
        <div className="mavex-container">
          <div className="text-center py-20">
            <p className="text-red-600 text-xl font-medium">حدث خطأ في تحميل الكوبونات</p>
            <button
              onClick={() => mutate('/api/coupons')}
              className="mt-4 bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700"
            >
              إعادة المحاولة
            </button>
            {String((error as any)?.message || '') && (
              <p className="mt-2 text-sm text-gray-500">{String((error as any)?.message)}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brand hero */}
      <div className="bg-[#0c1420] text-white rounded-2xl border border-brand-500/20 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/60 mb-1">لوحة الإدارة</div>
            <h1 className="text-2xl md:text-3xl font-black leading-tight">إدارة الكوبونات</h1>
            <p className="text-white/70 mt-1">إنشاء وإدارة كوبونات الخصم</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] bg-white font-bold inline-flex items-center gap-2">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={exportJSON} className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] bg-white font-bold inline-flex items-center gap-2">
              <Download className="w-4 h-4" /> JSON
            </button>
            <button onClick={() => setTesterOpen(v => !v)} className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] bg-white font-bold inline-flex items-center gap-2">
              <FlaskConical className="w-4 h-4" /> اختبار كوبون
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] bg-white font-bold inline-flex items-center gap-2">
              <Upload className="w-4 h-4" /> استيراد CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={async (e)=>{
              const file = e.target.files?.[0]; if (!file) return; setImporting(true);
              try {
                const text = await file.text();
                // Simple CSV parser (no embedded commas). Header: code,type,value,minSubtotal,usageLimit,startsAt,endsAt,active
                const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
                if (lines.length === 0) return;
                let startIdx = 0;
                const header = lines[0].toLowerCase();
                if (header.includes('code') && header.includes('type')) startIdx = 1;
                let ok = 0, fail = 0;
                for (let i=startIdx;i<lines.length;i++){
                  const cols = lines[i].split(',').map(s=>s.trim().replace(/^"|"$/g,''));
                  const [cCode, cType, cVal, cMin, cLimit, cStart, cEnd, cActive] = cols;
                  if (!cCode || !cType || !cVal) { fail++; continue; }
                  try {
                    const res = await fetch('/api/coupons', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({
                      code: cCode.toUpperCase(),
                      type: cType.toUpperCase(),
                      value: Number(cVal),
                      minSubtotal: cMin ? Number(cMin) : undefined,
                      usageLimit: cLimit ? Number(cLimit) : undefined,
                      startsAt: cStart ? new Date(cStart).toISOString() : undefined,
                      endsAt: cEnd ? new Date(cEnd).toISOString() : undefined,
                      active: cActive ? ['1','true','yes','y','on'].includes(cActive.toLowerCase()) : true,
                    })});
                    if (!res.ok) throw new Error();
                    ok++;
                  } catch { fail++; }
                }
                toastSuccess({ title: 'استيراد مكتمل', description: `تمت إضافة ${ok} وفشل ${fail}` });
                mutate('/api/coupons');
              } catch (err:any) {
                toastError({ title: 'فشل الاستيراد', description: err?.message || 'تعذر قراءة الملف' });
              } finally { setImporting(false); (e.target as HTMLInputElement).value=''; }
            }} />
            <button
              onClick={async ()=>{
                if (!Array.isArray(data) || data.length===0) return;
                if (!confirm('تعطيل جميع الكوبونات المنتهية/المكتملة؟')) return;
                const now = Date.now();
                let changed = 0;
                for (const c of data as any[]) {
                  const expired = (c.endsAt && new Date(c.endsAt).getTime() < now);
                  const exhausted = (c.usageLimit != null && c.usageCount >= c.usageLimit);
                  if (c.active && (expired || exhausted)) {
                    try { const r = await fetch(`/api/coupons/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: false }) }); if (r.ok) changed++; } catch {}
                  }
                }
                toastSuccess({ title: 'تم التنفيذ', description: `تم تعطيل ${changed} كوبون` });
                mutate('/api/coupons');
              }}
              className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] bg-white font-bold"
            >
              تعطيل المنتهية
            </button>
          </div>
        </div>
      </div>

      {/* Tester Panel */}
      {testerOpen && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-[#0c1420]"><FlaskConical className="w-5 h-5"/> <div className="font-extrabold">لوحة اختبار الكوبون</div></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200" placeholder="الكود" value={testerCode} onChange={e=>setTesterCode(e.target.value.toUpperCase())} />
            <input type="number" className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200" placeholder="المجموع قبل الخصم (subtotal)" value={testerSubtotal} onChange={e=>setTesterSubtotal(e.target.value===''? '': Number(e.target.value))} />
            <button
              onClick={async ()=>{
                setTesterLoading(true); setTesterResult(null);
                try {
                  const res = await fetch('/api/coupons/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: testerCode.trim(), subtotal: testerSubtotal || 0 }) });
                  const j = await res.json();
                  setTesterResult(j);
                } finally { setTesterLoading(false); }
              }}
              className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] font-bold"
              disabled={testerLoading || !testerCode || !testerSubtotal}
            >
              {testerLoading? '...جارِ الاختبار' : 'اختبار'}
            </button>
            {testerResult && (
              <div className="md:col-span-2 border-2 border-gray-200 rounded-xl p-3">
                {testerResult.valid ? (
                  <div className="text-green-700">صالح — خصم: <b>{testerResult.discount}</b> — الإجمالي: <b>{testerResult.total}</b></div>
                ) : (
                  <div className="text-red-700">غير صالح {testerResult.reason ? `(${testerResult.reason})` : ''}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-brand-600" />
          <div className="text-lg font-extrabold text-[#0c1420]">إنشاء كوبون</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            placeholder="الكود (CODE10)"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
          />
          <button
            onClick={() => {
              const rnd = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*34)]).join('');
              setCode(prev => prev?.trim() ? prev : `SAVE-${rnd}`);
              toastSuccess({ title: 'تم التوليد', description: 'تم توليد كود تلقائي' });
            }}
            className="px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-sm font-bold inline-flex items-center gap-2"
            title="توليد كود"
          >
            <Sparkles className="w-4 h-4"/> توليد
          </button>
          <select
            className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            value={type}
            onChange={e => setType(e.target.value as 'PERCENT' | 'FIXED')}
          >
            <option value="PERCENT">نسبة %</option>
            <option value="FIXED">مبلغ ثابت</option>
          </select>
          <input
            type="number"
            className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            placeholder={type === 'PERCENT' ? 'القيمة (1-100)' : 'القيمة (EGP)'}
            value={value}
            onChange={e => setValue(e.target.value === '' ? '' : Number(e.target.value))}
          />
          <input
            type="number"
            className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            placeholder="حد أدنى (اختياري)"
            value={minSubtotal}
            onChange={e => setMinSubtotal(e.target.value === '' ? '' : Number(e.target.value))}
          />
          <input
            type="number"
            className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            placeholder="حد الاستخدام (اختياري)"
            value={usageLimit}
            onChange={e => setUsageLimit(e.target.value === '' ? '' : Number(e.target.value))}
          />
          <label className="inline-flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-xl">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
            فعّال
          </label>
          <input
            type="datetime-local"
            className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            placeholder="يبدأ"
            value={startsAt}
            onChange={e => setStartsAt(e.target.value)}
          />
          <input
            type="datetime-local"
            className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            placeholder="ينتهي"
            value={endsAt}
            onChange={e => setEndsAt(e.target.value)}
          />
          <button
            onClick={createCoupon}
            disabled={isSubmitting}
            className="md:col-span-2 px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 font-bold text-[#0c1420]"
          >
            {isSubmitting ? '...جاري الإنشاء' : 'إنشاء'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <input
              ref={searchRef}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              placeholder="ابحث بالكود أو النوع..."
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500"/>
              <select
                className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                value={filterActive}
                onChange={e => { setFilterActive(e.target.value as any); setPage(1); }}
                title="تصفية بالحالة"
              >
                <option value="all">الكل</option>
                <option value="active">فعّالة</option>
                <option value="inactive">معطلة</option>
              </select>
              <select
                className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                value={filterType}
                onChange={e => { setFilterType(e.target.value as any); setPage(1); }}
                title="تصفية بالنوع"
              >
                <option value="all">النوع (الكل)</option>
                <option value="PERCENT">PERCENT</option>
                <option value="FIXED">FIXED</option>
              </select>
            </div>
            <select
              className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
            >
              <option value="created">الأحدث</option>
              <option value="code">الكود</option>
              <option value="value">القيمة</option>
              <option value="usage">الاستخدام</option>
              <option value="active">الفعّالية</option>
            </select>
            <button
              onClick={() => setDir(d => (d === 'asc' ? 'desc' : 'asc'))}
              className="px-3 py-2 rounded-xl border-2 border-gray-200"
              title="تبديل الاتجاه"
            >
              {dir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <colgroup>
              <col style={{ width: '220px' }} />
              <col style={{ width: '160px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '160px' }} />
            </colgroup>
            <thead className="bg-[#0c1420] sticky top-0 z-10 text-white">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider">الكود</th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider">النوع/القيمة</th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider">الحد الأدنى</th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider">الاستخدام</th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider">الصلاحية</th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">لا توجد بيانات</td>
                </tr>
              ) : (
                paged.map((c) => {
                  const validity =
                    (c.startsAt ? new Date(c.startsAt).toLocaleDateString('ar-EG') : '—') +
                    ' → ' +
                    (c.endsAt ? new Date(c.endsAt).toLocaleDateString('ar-EG') : '—');

                  return (
                    <tr key={c.id} className="hover:bg-brand-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-[#0c1420]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate max-w-[160px]" title={c.code}>{c.code}</span>
                          <button
                            onClick={async ()=>{ try { await navigator.clipboard.writeText(c.code); toastSuccess({ title: 'تم النسخ', description: c.code }); } catch {} }}
                            className="p-1 rounded-lg border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50"
                            title="نسخ الكود"
                          >
                            <Copy className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-mono tabular-nums">
                        {c.type === 'PERCENT' ? `${c.value}%` : `EGP ${c.value}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-mono tabular-nums">{c.minSubtotal ? `EGP ${c.minSubtotal}` : '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3 justify-end">
                          <span className="font-mono tabular-nums">{c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</span>
                          {c.usageLimit ? (
                            <div className="w-28 h-2 rounded-full bg-gray-200 overflow-hidden">
                              <div className="h-full bg-brand-500" style={{ width: `${Math.min(100, Math.round((c.usageCount / Math.max(1, c.usageLimit)) * 100))}%` }} />
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono tabular-nums">{validity}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleActive(c)}
                          className={`px-3 py-1 text-sm font-bold rounded-full border transition-all duration-300 ${
                            c.active ? 'bg-green-100 text-green-800 border-green-500' : 'bg-gray-100 text-gray-700 border-gray-400'
                          }`}
                          title={c.active ? 'تعطيل' : 'تفعيل'}
                        >
                          {c.active ? 'فعّال' : 'معطل'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleActive(c)}
                            className="px-2 py-1 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-sm font-bold inline-flex items-center gap-1"
                            title={c.active ? 'تعطيل' : 'تفعيل'}
                          >
                            {c.active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => deleteCoupon(c.id)}
                            className="px-2 py-1 rounded-xl border-2 border-red-200 text-red-700 hover:border-red-500 hover:bg-red-50 text-sm font-bold inline-flex items-center gap-1"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">صفحة {currentPage} من {totalPages} — {filtered.length} عنصر</div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-2 rounded-xl border-2 border-gray-200 disabled:opacity-50 inline-flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" /> السابق
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-2 rounded-xl border-2 border-gray-200 disabled:opacity-50 inline-flex items-center gap-1"
            >
              التالي <ChevronLeft className="w-4 h-4" />
            </button>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-3 py-2 rounded-xl border-2 border-gray-200"
            >
              {[10, 20, 50, 100].map(n => (
                <option key={n} value={n}>{n}/صفحة</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}