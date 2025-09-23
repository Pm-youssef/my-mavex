'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, RefreshCw, Pin, PinOff, Trash2, Download, Printer, ArrowUpDown } from 'lucide-react';
import { toastSuccess, toastError } from '@/components/ui/Toast';
 

interface Product {
  id: string;
  name: string;
  imageUrl?: string;
}

interface Review {
  id: string;
  productId: string;
  rating: number;
  comment?: string | null;
  pinned: boolean;
  authorId?: string | null;
  createdAt: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export default function AdminReviewsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'all'|'approved'|'pending'|'rejected'>('all');
  const [sortBy, setSortBy] = useState<'date'|'rating'>('date');
  const [dir, setDir] = useState<'asc'|'desc'>('desc');

  // Check admin session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/admin/session', { cache: 'no-store' });
        const data = await res.json();
        setIsAuthenticated(!!data?.isAuthenticated);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkSession();
  }, []);

  const performStatus = async (ids: string[], status: 'approved' | 'rejected') => {
    if (!ids.length) return;
    if (!isAuthenticated) {
      alert('يجب تسجيل الدخول كمسؤول لتنفيذ هذه العملية');
      return;
    }
    setBusy(true);
    try {
      for (const id of ids) {
        await fetch(`/api/reviews/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
      }
      await loadReviews(selectedProductId);
      toastSuccess({ title: 'تم التحديث', description: `تم تعيين الحالة (${status}) لـ ${ids.length} تعليقًا` });
    } catch (e: any) {
      toastError({ title: 'فشل التحديث', description: String(e?.message || e) });
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        // After login, load products and reviews
        await loadProducts();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || 'كلمة المرور غير صحيحة');
      }
    } catch {
      alert('خطأ في تسجيل الدخول');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      setIsAuthenticated(false);
      setPassword('');
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      const normalized: Product[] = Array.isArray(data)
        ? data
            .filter((p: any) => p && typeof p.id === 'string')
            .map((p: any) => ({ id: String(p.id), name: String(p.name || ''), imageUrl: p.imageUrl }))
        : [];
      setProducts(normalized);
      if (normalized.length > 0) setSelectedProductId(prev => prev || normalized[0].id);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    // Load products once page is open; doesn't require auth to view, but actions do
    loadProducts();
  }, []);

  const loadReviews = async (pid: string) => {
    if (!pid) return;
    setLoadingReviews(true);
    try {
      const res = await fetch(`/api/reviews?productId=${encodeURIComponent(pid)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      const arr = await res.json();
      const normalized: Review[] = Array.isArray(arr)
        ? arr.map((r: any) => ({
            id: String(r.id),
            productId: String(r.productId),
            rating: Number(r.rating) || 0,
            comment: typeof r.comment === 'string' ? r.comment : null,
            pinned: Boolean(r.pinned),
            authorId: typeof r.authorId === 'string' ? r.authorId : null,
            createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
            status: (r.status === 'pending' || r.status === 'approved' || r.status === 'rejected') ? r.status : 'approved',
          }))
        : [];
      setReviews(normalized);
      setSelected({});
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (selectedProductId) {
      loadReviews(selectedProductId);
    }
  }, [selectedProductId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = [...reviews];
    if (term) {
      list = list.filter(r =>
        (r.comment || '').toLowerCase().includes(term) ||
        (r.authorId || '').toLowerCase().includes(term) ||
        String(r.rating).includes(term)
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter(r => (r.status || 'approved') === statusFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        cmp = (a.rating || 0) - (b.rating || 0);
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [reviews, search, statusFilter, sortBy, dir]);

  const allSelected = useMemo(() => {
    if (filtered.length === 0) return false;
    return filtered.every(r => selected[r.id]);
  }, [filtered, selected]);

  const toggleSelectAll = () => {
    if (allSelected) {
      const next: Record<string, boolean> = { ...selected };
      filtered.forEach(r => delete next[r.id]);
      setSelected(next);
    } else {
      const next: Record<string, boolean> = { ...selected };
      filtered.forEach(r => (next[r.id] = true));
      setSelected(next);
    }
  };

  const performPin = async (ids: string[], pin: boolean) => {
    if (!ids.length) return;
    if (!isAuthenticated) {
      alert('يجب تسجيل الدخول كمسؤول لتنفيذ هذه العملية');
      return;
    }
    setBusy(true);
    try {
      for (const id of ids) {
        // PATCH each (small datasets)
        await fetch(`/api/reviews/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pinned: pin }),
        });
      }
      await loadReviews(selectedProductId);
      toastSuccess({ title: pin ? 'تثبيت' : 'إلغاء تثبيت', description: `${ids.length} تعليق` });
    } catch (e: any) {
      toastError({ title: 'فشل العملية', description: String(e?.message || e) });
    } finally {
      setBusy(false);
    }
  };

  const performDelete = async (ids: string[]) => {
    if (!ids.length) return;
    if (!confirm('هل أنت متأكد من حذف التعليقات المحددة؟')) return;
    if (!isAuthenticated) {
      alert('يجب تسجيل الدخول كمسؤول لتنفيذ هذه العملية');
      return;
    }
    setBusy(true);
    try {
      for (const id of ids) {
        await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
      }
      await loadReviews(selectedProductId);
      toastSuccess({ title: 'تم الحذف', description: `${ids.length} تعليق` });
    } catch (e: any) {
      toastError({ title: 'فشل الحذف', description: String(e?.message || e) });
    } finally {
      setBusy(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  

  // Export helpers
  const toCSV = (rows: Review[]) => {
    const headers = ['id','productId','rating','comment','pinned','status','createdAt'];
    const lines = rows.map(r => [
      r.id,
      r.productId,
      r.rating,
      JSON.stringify(r.comment || ''),
      r.pinned ? '1' : '0',
      r.status || 'approved',
      r.createdAt,
    ].join(','));
    return [headers.join(','), ...lines].join('\n');
  };
  const downloadBlob = (content: string, mime: string, filename: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  const downloadCSV = () => downloadBlob(toCSV(filtered as Review[]), 'text/csv;charset=utf-8;', `reviews-${selectedProductId || 'all'}-${Date.now()}.csv`);
  const downloadJSON = () => downloadBlob(JSON.stringify(filtered, null, 2), 'application/json', `reviews-${selectedProductId || 'all'}-${Date.now()}.json`);

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="bg-[#0c1420] text-white rounded-2xl border border-brand-500/20 p-6 shadow-sm">
          <div className="text-xs uppercase tracking-widest text-white/60 mb-1">لوحة الإدارة</div>
          <h1 className="text-2xl md:text-3xl font-black leading-tight">تسجيل الدخول</h1>
          <p className="text-white/70 mt-1">أدخل كلمة المرور للوصول لإدارة التعليقات</p>
        </div>
        <div className="max-w-md">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="text-center mb-8">
                <h2 className="text-xl font-extrabold text-[#0c1420] mb-2">مرحبا بك</h2>
                <p className="text-gray-600">يرجى إدخال كلمة المرور الخاصة بالمشرف</p>
              </div>
              <form onSubmit={e => { e.preventDefault(); handleLogin(); }}>
                <div className="mb-8">
                  <label className="mavex-label text-black">كلمة المرور</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="mavex-input focus:border-brand-600 focus:ring-brand-200"
                    placeholder="أدخل كلمة المرور"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-[#0c1420] py-3 px-6 rounded-xl font-extrabold transition-all duration-300 border-2 border-brand-600 hover:border-brand-700">دخول</button>
                  <Link href="/admin" className="px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 font-bold text-[#0c1420]">العودة</Link>
                </div>
              </form>
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
            <h1 className="text-2xl md:text-3xl font-black leading-tight">التعليقات</h1>
            <p className="text-white/70 mt-1">عرض، تثبيت، اعتماد، رفض، وحذف تعليقات العملاء</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] bg-white font-bold">العودة</Link>
            {selectedProductId && (
              <button onClick={() => loadReviews(selectedProductId)} disabled={loadingReviews} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] bg-white transition-colors">
                <RefreshCw className="w-4 h-4"/> تحديث
              </button>
            )}
            <button onClick={handleLogout} className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-rose-500 hover:bg-rose-50 text-[#0c1420] bg-white font-bold">تسجيل خروج</button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        {/* Row 1: Search (full width) */}
        <div className="relative min-w-0 mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث في التعليقات بالعبارة أو المعرّف أو التقييم..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors"
          />
        </div>

        {/* Row 2: filters/actions (wrap) */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedProductId}
            onChange={e => setSelectedProductId(e.target.value)}
            className="pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors appearance-none"
            disabled={loadingProducts}
          >
            {!loadingProducts && products.length === 0 && (
              <option value="">لا توجد منتجات</option>
            )}
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setStatusFilter('all')} className={`shrink-0 px-3 py-2 rounded-xl border-2 ${statusFilter==='all'?'border-brand-500 bg-brand-50 text-[#0c1420]':'border-gray-200 hover:border-brand-500 hover:bg-brand-50'}`}>الكل</button>
            <button onClick={() => setStatusFilter('approved')} className={`shrink-0 px-3 py-2 rounded-xl border-2 ${statusFilter==='approved'?'border-brand-500 bg-brand-50 text-[#0c1420]':'border-gray-200 hover:border-brand-500 hover:bg-brand-50'}`}>مقبول</button>
            <button onClick={() => setStatusFilter('pending')} className={`shrink-0 px-3 py-2 rounded-xl border-2 ${statusFilter==='pending'?'border-brand-500 bg-brand-50 text-[#0c1420]':'border-gray-200 hover:border-brand-500 hover:bg-brand-50'}`}>قيد المراجعة</button>
            <button onClick={() => setStatusFilter('rejected')} className={`shrink-0 px-3 py-2 rounded-xl border-2 ${statusFilter==='rejected'?'border-brand-500 bg-brand-50 text-[#0c1420]':'border-gray-200 hover:border-brand-500 hover:bg-brand-50'}`}>مرفوض</button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setSortBy(prev=>prev==='date'?'rating':'date')} className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50">
              <ArrowUpDown className="w-4 h-4"/> {sortBy==='date'?'تاريخ':'تقييم'}
            </button>
            <button onClick={() => setDir(d => d==='asc'?'desc':'asc')} className="shrink-0 px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50">{dir==='asc'?'تصاعدي':'تنازلي'}</button>
            <button onClick={() => downloadCSV()} className="shrink-0 px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 inline-flex items-center gap-1"><Download className="w-4 h-4"/> CSV</button>
            <button onClick={() => downloadJSON()} className="shrink-0 px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 inline-flex items-center gap-1"><Download className="w-4 h-4"/> JSON</button>
            <button onClick={() => window.print()} className="shrink-0 px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 inline-flex items-center gap-1"><Printer className="w-4 h-4"/> طباعة</button>
          </div>
        </div>
      </div>

        {/* Table */}
        {loadingReviews ? (
          <div className="modern-card text-center py-20">
            <div className="mavex-loading h-32 w-32 mx-auto"></div>
            <p className="mt-8 text-gray-600 text-xl font-medium">جارٍ تحميل التعليقات...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="modern-card text-center py-20">
            <div className="w-32 h-32 mx-auto mb-8 text-gray-300">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m-4 0H7a2 2 0 01-2-2V8m0 0l3.586-3.586A2 2 0 0110.172 4h3.656a2 2 0 011.414.586L19 8m-7 4h.01" />
              </svg>
            </div>
            <p className="text-gray-600 text-xl font-medium">
              {selectedProductId ? 'لا توجد تعليقات لهذا المنتج' : 'اختر منتجًا لعرض تعليقاتِه'}
            </p>
          </div>
        ) : (
          <div className="modern-card overflow-hidden">
            {/* Bulk actions */}
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-200">
              <label className="flex items-center gap-2 text-sm font-bold text-black">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                تحديد الكل ({filtered.filter(r => selected[r.id]).length}/{filtered.length})
              </label>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  className="px-4 py-2 rounded-lg border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-sm font-bold"
                  onClick={() => performPin(Object.keys(selected).filter(id => selected[id]), true)}
                  disabled={busy}
                >
                  <Pin className="inline-block w-4 h-4 mr-1" /> تثبيت المحدد
                </button>
                <button
                  className="px-4 py-2 rounded-lg border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-sm font-bold"
                  onClick={() => performPin(Object.keys(selected).filter(id => selected[id]), false)}
                  disabled={busy}
                >
                  <PinOff className="inline-block w-4 h-4 mr-1" /> إلغاء التثبيت
                </button>
                <button
                  className="px-4 py-2 rounded-lg border-2 border-emerald-200 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50 text-sm font-bold"
                  onClick={() => performStatus(Object.keys(selected).filter(id => selected[id]), 'approved')}
                  disabled={busy}
                >
                  اعتماد المحدد
                </button>
                <button
                  className="px-4 py-2 rounded-lg border-2 border-rose-200 text-rose-700 hover:border-rose-500 hover:bg-rose-50 text-sm font-bold"
                  onClick={() => performStatus(Object.keys(selected).filter(id => selected[id]), 'rejected')}
                  disabled={busy}
                >
                  رفض المحدد
                </button>
                <button
                  className="px-4 py-2 rounded-lg border-2 border-red-200 text-red-700 hover:border-red-500 hover:bg-red-50 text-sm font-bold"
                  onClick={() => performDelete(Object.keys(selected).filter(id => selected[id]))}
                  disabled={busy}
                >
                  <Trash2 className="inline-block w-4 h-4 mr-1" /> حذف المحدد
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-brand-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-bold text-black">تحديد</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-black">التقييم</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-black">النص</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-black">المؤلف</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-black">التثبيت</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-black">حالة المراجعة</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-black">التاريخ</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-black">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filtered.map((r, idx) => (
                    <tr key={r.id} className={`transition-colors ${idx % 2 ? 'bg-slate-50/40' : 'bg-white'} hover:bg-brand-50/50`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={!!selected[r.id]}
                          onChange={e => setSelected(s => ({ ...s, [r.id]: e.target.checked }))}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-[#0c1420]">
                        <span className="text-brand-600">{'★'.repeat(Math.max(0, Math.min(5, r.rating)))}</span>
                        <span className="text-gray-300">{'★'.repeat(Math.max(0, 5 - Math.max(0, Math.min(5, r.rating))))}</span>
                        <span className="ml-2 text-gray-500">({r.rating}/5)</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xl">
                        {r.comment || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.authorId || <span className="text-gray-400">—</span>}</td>
                      <td className="px-4 py-3">
                        {r.pinned ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-800 border border-brand-500">مثبّت</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-300">عادي</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'approved' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-500">مقبول</span>
                        )}
                        {r.status === 'pending' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-800 border border-brand-500">قيد المراجعة</span>
                        )}
                        {r.status === 'rejected' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-500">مرفوض</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {r.pinned ? (
                            <button
                              className="px-3 py-1 rounded-lg border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-xs font-bold"
                              onClick={() => performPin([r.id], false)}
                              disabled={busy}
                            >
                              <PinOff className="inline-block w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              className="px-3 py-1 rounded-lg border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-xs font-bold"
                              onClick={() => performPin([r.id], true)}
                              disabled={busy}
                            >
                              <Pin className="inline-block w-4 h-4" />
                            </button>
                          )}
                          <button
                            className="px-3 py-1 rounded-lg border-2 border-emerald-200 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50 text-xs font-bold"
                            onClick={() => performStatus([r.id], 'approved')}
                            disabled={busy}
                            title="اعتماد"
                          >
                            اعتماد
                          </button>
                          <button
                            className="px-3 py-1 rounded-lg border-2 border-rose-200 text-rose-700 hover:border-rose-500 hover:bg-rose-50 text-xs font-bold"
                            onClick={() => performStatus([r.id], 'rejected')}
                            disabled={busy}
                            title="رفض"
                          >
                            رفض
                          </button>
                          <button
                            className="px-3 py-1 rounded-lg border-2 border-red-200 text-red-700 hover:border-red-500 hover:bg-red-50 text-xs font-bold"
                            onClick={() => performDelete([r.id])}
                            disabled={busy}
                          >
                            <Trash2 className="inline-block w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}
