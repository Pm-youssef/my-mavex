'use client';

import { useMemo, useState } from 'react';
import { Edit, Trash2, Search, Save, Download, Printer, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import useSWR from 'swr';
import { toastError, toastSuccess } from '@/components/ui/Toast';
import LocalImagePicker from '@/components/LocalImagePicker';
import Image from 'next/image';

export default function CategoriesPage() {
  type Category = {
    id: string;
    name: string;
    slug: string;
    description?: string;
    displayOrder?: number;
    parentId?: string | null;
    productsCount?: number;
    imageUrl?: string | null;
    bannerUrl?: string | null;
    thumbnailUrl?: string | null;
    iconUrl?: string | null;
  };

  // UI State
  const [q, setQ] = useState('');
  const [form, setForm] = useState<Partial<Category>>({ name: '', slug: '', description: '', displayOrder: 0, imageUrl: '', bannerUrl: '', thumbnailUrl: '', iconUrl: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<'displayOrder' | 'name' | 'slug' | 'createdAt'>('displayOrder');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  // Build SWR key
  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    params.set('sort', sort);
    params.set('dir', dir);
    return `/api/admin/categories?${params.toString()}`;
  }, [q, page, pageSize, sort, dir]);

  const fetcher = (url: string) => fetch(url).then(r => r.json());
  const { data, error, isLoading, mutate } = useSWR<{ items: Category[]; total: number; page: number; pageSize: number }>(listUrl, fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const items = useMemo(() => data?.items || [], [data]);
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Parents list for selection
  const parentsUrl = useMemo(() => `/api/admin/categories?sort=name&dir=asc&page=1&pageSize=1000`, []);
  const { data: parentsData } = useSWR<{ items: Category[] }>(parentsUrl, fetcher);
  const parents = useMemo(() => parentsData?.items || [], [parentsData]);
  const parentNameById = useMemo(() => {
    const map = new Map<string, string>();
    parents.forEach(p => map.set(p.id, p.name));
    return map;
  }, [parents]);

  const resetForm = () => { setForm({ name: '', slug: '', description: '', displayOrder: 0, parentId: undefined, imageUrl: '', bannerUrl: '', thumbnailUrl: '', iconUrl: '' }); setEditingId(null); };

  const validate = () => {
    const name = (form.name || '').trim();
    if (!name) {
      toastError({ title: 'خطأ', description: 'الاسم مطلوب' });
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    const payload = {
      name: (form.name || '').trim(),
      slug: (form.slug || '').trim(),
      description: (form.description || '').trim(),
      displayOrder: typeof form.displayOrder === 'number' ? form.displayOrder : 0,
      parentId: form.parentId || null,
      imageUrl: (form.imageUrl || '').trim() || undefined,
      bannerUrl: (form.bannerUrl || '').trim() || undefined,
      thumbnailUrl: (form.thumbnailUrl || '').trim() || undefined,
      iconUrl: (form.iconUrl || '').trim() || undefined,
    };
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/categories/${editingId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const txt = await res.text();
          try {
            const j = JSON.parse(txt);
            throw new Error(j?.message || j?.error || txt || 'Failed');
          } catch {
            throw new Error(txt || 'Failed');
          }
        }
        toastSuccess({ title: 'تم الحفظ', description: 'تم تحديث القسم بنجاح' });
      } else {
        const res = await fetch(`/api/admin/categories`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const txt = await res.text();
          try {
            const j = JSON.parse(txt);
            throw new Error(j?.message || j?.error || txt || 'Failed');
          } catch {
            throw new Error(txt || 'Failed');
          }
        }
        toastSuccess({ title: 'تم الإضافة', description: 'تمت إضافة القسم بنجاح' });
      }
      resetForm();
      mutate();
    } catch (e: any) {
      toastError({ title: 'فشل العملية', description: e.message || 'حدث خطأ غير متوقع' });
    }
  };

  const edit = (c: Category) => { setEditingId(c.id); setForm({ name: c.name, slug: c.slug, description: c.description || '', displayOrder: c.displayOrder || 0, parentId: c.parentId || undefined, imageUrl: c.imageUrl || '', bannerUrl: c.bannerUrl || '', thumbnailUrl: c.thumbnailUrl || '', iconUrl: c.iconUrl || '' }); };
  const confirmDelete = (c: Category) => setPendingDelete({ id: c.id, name: c.name });
  const doDelete = async () => {
    if (!pendingDelete) return;
    try {
      const res = await fetch(`/api/admin/categories/${pendingDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const txt = await res.text();
        try {
          const j = JSON.parse(txt);
          throw new Error(j?.message || j?.error || txt || 'Failed');
        } catch {
          throw new Error(txt || 'Failed');
        }
      }
      toastSuccess({ title: 'تم الحذف', description: `تم حذف القسم: ${pendingDelete.name}` });
      setPendingDelete(null);
      mutate();
    } catch (e: any) {
      toastError({ title: 'تعذر الحذف', description: e.message || 'حدث خطأ' });
    }
  };

  const exportCSV = () => {
    const headers = ['id','name','slug','description','displayOrder'];
    const rows = items.map(i => [i.id, i.name, i.slug, i.description || '', String(i.displayOrder ?? 0)]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'categories.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'categories.json'; a.click(); URL.revokeObjectURL(url);
  };

  const printPage = () => window.print();

  const toggleSort = (key: 'displayOrder' | 'name' | 'slug' | 'createdAt') => {
    if (sort === key) setDir(prev => prev === 'asc' ? 'desc' : 'asc'); else { setSort(key); setDir('asc'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[#0c1420]">الأقسام</h1>
          <p className="text-gray-600 mt-1">إدارة الأقسام وتصنيفات المنتجات</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 order-2 lg:order-1">
          <h2 className="text-xl font-extrabold text-[#0c1420] mb-4">{editingId ? 'تعديل قسم' : 'إضافة قسم'}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-[#0c1420]">الاسم</label>
              <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} aria-invalid={!form.name || form.name.trim()==='' ? true : false} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-[#0c1420]">المُعرّف (Slug)</label>
              <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors" value={form.slug || ''} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="سيتم توليده تلقائياً إن تركته فارغاً" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-[#0c1420]">الوصف</label>
              <textarea rows={3} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}></textarea>
            </div>
            {/* Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LocalImagePicker
                label="صورة رئيسية"
                value={form.imageUrl || ''}
                onChange={(v)=> setForm(prev=>({ ...prev, imageUrl: v }))}
                placeholder="/img/category-main.png"
              />
              <LocalImagePicker
                label="صورة بانر (اختياري)"
                value={form.bannerUrl || ''}
                onChange={(v)=> setForm(prev=>({ ...prev, bannerUrl: v }))}
                placeholder="/img/category-banner.png"
              />
              <LocalImagePicker
                label="صورة مصغّرة (اختياري)"
                value={form.thumbnailUrl || ''}
                onChange={(v)=> setForm(prev=>({ ...prev, thumbnailUrl: v }))}
                placeholder="/img/category-thumb.png"
              />
              <LocalImagePicker
                label="أيقونة (اختياري)"
                value={form.iconUrl || ''}
                onChange={(v)=> setForm(prev=>({ ...prev, iconUrl: v }))}
                placeholder="/img/category-icon.png"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-[#0c1420]">القسم الأب</label>
              <select className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors" value={form.parentId ?? ''} onChange={e => setForm({ ...form, parentId: e.target.value || undefined })}>
                <option value="">بدون أب</option>
                {parents.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-[#0c1420]">ترتيب العرض</label>
              <input type="number" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors" value={form.displayOrder ?? 0} onChange={e => setForm({ ...form, displayOrder: Number(e.target.value || 0) })} />
            </div>
            <div className="flex gap-3">
              <button onClick={save} className="btn-gold-gradient flex items-center gap-2 px-4 py-2"><Save className="w-4 h-4"/> <span>{editingId ? 'حفظ التعديل' : 'إضافة'}</span></button>
              {editingId && (
                <button onClick={resetForm} className="px-4 py-2 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50">إلغاء</button>
              )}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden order-1 lg:order-2">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><Search className="w-4 h-4 text-gray-400"/></div>
              <input className="block w-full pr-10 pl-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-colors" placeholder="ابحث عن قسم..." value={q} onChange={(e)=>{ setQ(e.target.value); setPage(1); }} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportCSV} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] transition-colors"><Download className="w-4 h-4"/> CSV</button>
              <button onClick={exportJSON} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] transition-colors"><Download className="w-4 h-4"/> JSON</button>
              <button onClick={printPage} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] transition-colors"><Printer className="w-4 h-4"/> طباعة</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">صورة</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <button onClick={()=>toggleSort('name')} className="inline-flex items-center gap-1">الاسم <ArrowUpDown className="w-3 h-3"/></button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <button onClick={()=>toggleSort('slug')} className="inline-flex items-center gap-1">Slug <ArrowUpDown className="w-3 h-3"/></button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">الوصف</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">الأب</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">عدد المنتجات</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <button onClick={()=>toggleSort('displayOrder')} className="inline-flex items-center gap-1">ترتيب <ArrowUpDown className="w-3 h-3"/></button>
                  </th>
                  <th className="px-6 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-500">جاري التحميل...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-500">لا توجد أقسام</td></tr>
                ) : items.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {(() => {
                        const src = c.thumbnailUrl || c.imageUrl || '';
                        return src ? (
                          <Image src={src} alt={c.name} width={48} height={48} className="rounded-lg border border-gray-200 object-cover w-12 h-12" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg border border-gray-100 bg-gray-50"/>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 font-bold text-[#0c1420]">{c.name}</td>
                    <td className="px-6 py-4 text-gray-600">{c.slug}</td>
                    <td className="px-6 py-4 text-gray-600">{c.description}</td>
                    <td className="px-6 py-4 text-gray-600">{c.parentId ? parentNameById.get(c.parentId) || '—' : '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{c.productsCount ?? 0}</td>
                    <td className="px-6 py-4 text-gray-600">{c.displayOrder ?? 0}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => edit(c)} className="text-gray-600 hover:text-brand-700 transition-colors" aria-label={`تعديل ${c.name}`}><Edit className="w-4 h-4"/></button>
                        <button onClick={() => confirmDelete(c)} className="text-red-600 hover:text-red-700" aria-label={`حذف ${c.name}`}><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">إجمالي: {total} — صفحة {page} من {totalPages}</div>
            <div className="flex items-center gap-2">
              <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors ${page<=1?'border-gray-200 text-gray-300':'border-gray-200 text-[#0c1420] hover:border-brand-500 hover:bg-brand-50'}`}><ChevronRight className="w-4 h-4"/> السابق</button>
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors ${page>=totalPages?'border-gray-200 text-gray-300':'border-gray-200 text-[#0c1420] hover:border-brand-500 hover:bg-brand-50'}`}>التالي <ChevronLeft className="w-4 h-4"/></button>
              <select value={pageSize} onChange={e=>{ setPageSize(Number(e.target.value)); setPage(1); }} className="border-2 border-gray-200 rounded-xl px-2 py-1 text-sm">
                {[10,20,50,100].map(n => <option key={n} value={n}>{n}/صفحة</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6">
            <div className="text-xl font-extrabold text-[#0c1420] mb-2">تأكيد الحذف</div>
            <p className="text-gray-700 mb-6">هل أنت متأكد من حذف القسم: <span className="font-bold">{pendingDelete.name}</span>؟ لا يمكن التراجع.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={()=>setPendingDelete(null)} className="px-4 py-2 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50">إلغاء</button>
              <button onClick={doDelete} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">حذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
