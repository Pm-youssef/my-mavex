'use client';

import useSWR from 'swr';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, Mail, Phone, Download, Printer, Calendar, Users, ShoppingBag, CircleDollarSign, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: { id: string; name: string; imageUrl: string };
}

interface Order {
  id: string;
  orderId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  customerCity?: string;
  customerGovernorate?: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

type SortKey = 'name' | 'orders' | 'spent' | 'lastOrder';

export default function CustomersPage() {
  const { data = [], isLoading } = useSWR<Order[]>('/api/orders', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('lastOrder');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const searchRef = useRef<HTMLInputElement>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const customers = useMemo(() => {
    const map = new Map<string, any>();
    (data || []).forEach((o) => {
      const key = (o.customerEmail || o.customerPhone || '').toLowerCase();
      if (!key) return;
      const prev = map.get(key) || {
        id: key,
        name: o.customerName,
        email: o.customerEmail,
        phone: o.customerPhone,
        ordersCount: 0,
        totalSpent: 0,
        lastOrder: null as string | null,
      };
      prev.ordersCount += 1;
      prev.totalSpent += Number(o.totalAmount || 0);
      const d = new Date(o.createdAt).toISOString();
      if (!prev.lastOrder || d > prev.lastOrder) prev.lastOrder = d;
      map.set(key, prev);
    });
    return Array.from(map.values());
  }, [data]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term
      ? customers.filter((c: any) =>
          c.name?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.phone?.includes(term)
        )
      : customers;
    const sorted = [...list].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'orders') cmp = a.ordersCount - b.ordersCount;
      if (sortBy === 'spent') cmp = a.totalSpent - b.totalSpent;
      if (sortBy === 'lastOrder') cmp = new Date(a.lastOrder || 0).getTime() - new Date(b.lastOrder || 0).getTime();
      return dir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [customers, q, sortBy, dir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil((filtered as any[]).length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (filtered as any[]).slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const changeSort = (k: SortKey) => {
    if (k === sortBy) setDir(dir === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(k);
      setDir('asc');
    }
  };

  // Export / Print helpers (use current filtered list)
  const toCSV = (rows: any[]) => {
    const headers = ['العميل','البريد','الهاتف','عدد الطلبات','إجمالي الإنفاق','آخر طلب'];
    const lines = rows.map(r => [
      JSON.stringify(r.name ?? ''),
      JSON.stringify(r.email ?? ''),
      JSON.stringify(r.phone ?? ''),
      r.ordersCount ?? 0,
      r.totalSpent ?? 0,
      r.lastOrder ? new Date(r.lastOrder).toLocaleDateString('ar-EG') : ''
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
    downloadBlob(toCSV(filtered as any[]), 'text/csv;charset=utf-8;', `customers-${Date.now()}.csv`);
  }, [filtered]);
  const exportJSON = useCallback(() => {
    downloadBlob(JSON.stringify(filtered, null, 2), 'application/json', `customers-${Date.now()}.json`);
  }, [filtered]);
  const printPage = useCallback(() => window.print(), []);

  // Keyboard shortcuts: F focus search, E export CSV, P print
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'f') searchRef.current?.focus();
      else if (k === 'e') exportCSV();
      else if (k === 'p') printPage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exportCSV, printPage]);

  // Close drawer on ESC
  useEffect(() => {
    if (!selectedCustomer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedCustomer(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedCustomer]);

  return (
    <div className="space-y-6">
      {/* Brand hero */}
      <div className="bg-[#0c1420] text-white rounded-2xl border border-brand-500/20 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/60 mb-1">لوحة الإدارة</div>
            <h1 className="text-2xl md:text-3xl font-black leading-tight">العملاء</h1>
            <p className="text-white/70 mt-1">نظرة موحّدة لعملائك المستخلصين من الطلبات</p>
          </div>
        </div>
      </div>

      {/* Customer Details Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedCustomer(null)} />
          <div className="absolute top-0 bottom-0 right-0 w-full sm:w-[520px] bg-white shadow-xl border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#0c1420] text-white">
              <div>
                <div className="text-xs uppercase tracking-widest text-white/60">العميل</div>
                <div className="text-xl font-black">{selectedCustomer.name || '-'}</div>
                <div className="text-sm text-white/70">{selectedCustomer.email || ''} {selectedCustomer.phone ? ' • ' + selectedCustomer.phone : ''}</div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5"/>
              </button>
            </div>

            {(() => {
              const keyOf = (o: Order) => (o.customerEmail || o.customerPhone || '').toLowerCase();
              const orders = (data || []).filter((o: Order) => keyOf(o) === selectedCustomer.id);
              const sorted = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              const total = sorted.reduce((s, o) => s + (o.totalAmount || 0), 0);
              const avg = sorted.length ? total / sorted.length : 0;
              const firstT = sorted.length ? new Date(sorted[sorted.length - 1].createdAt).getTime() : 0;
              const lastT = sorted.length ? new Date(sorted[0].createdAt).getTime() : 0;
              const daysSpan = firstT && lastT ? Math.max(1, Math.round((lastT - firstT) / (1000 * 60 * 60 * 24))) : 0;
              const freq = sorted.length && daysSpan ? (sorted.length / daysSpan) : 0; // عدد الطلبات في اليوم تقريباً

              // Top products
              const countMap = new Map<string, number>();
              sorted.forEach(o => {
                (o.items || []).forEach(it => {
                  const name = it.product?.name || 'منتج';
                  countMap.set(name, (countMap.get(name) || 0) + it.quantity);
                });
              });
              const topProducts = Array.from(countMap.entries()).sort((a,b) => b[1] - a[1]).slice(0, 5);

              return (
                <div className="flex-1 overflow-y-auto">
                  {/* Behavior */}
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-gray-100">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="text-xs text-gray-500">إجمالي الإنفاق</div>
                      <div className="text-2xl font-extrabold text-brand-600">EGP {total.toLocaleString()}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="text-xs text-gray-500">متوسط الطلب</div>
                      <div className="text-2xl font-extrabold text-[#0c1420]">EGP {avg.toFixed(0)}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="text-xs text-gray-500">عدد الطلبات</div>
                      <div className="text-2xl font-extrabold text-[#0c1420]">{sorted.length}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="text-xs text-gray-500">الوتيرة (طلب/يوم)</div>
                      <div className="text-2xl font-extrabold text-[#0c1420]">{freq.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Top products */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="text-sm font-bold text-[#0c1420] mb-2">أفضل المنتجات</div>
                    {topProducts.length === 0 ? (
                      <div className="text-sm text-gray-500">لا توجد بيانات</div>
                    ) : (
                      <ul className="space-y-2">
                        {topProducts.map(([name, qty]) => (
                          <li key={name} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{name}</span>
                            <span className="font-bold text-[#0c1420]">× {qty}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Recent orders */}
                  <div className="p-4">
                    <div className="text-sm font-bold text-[#0c1420] mb-2">آخر الطلبات</div>
                    {sorted.length === 0 ? (
                      <div className="text-sm text-gray-500">لا توجد طلبات</div>
                    ) : (
                      <div className="space-y-3">
                        {sorted.slice(0, 10).map(o => (
                          <div key={o.id} className="border border-gray-200 rounded-xl p-3 hover:border-brand-400 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-bold text-[#0c1420]">#{o.orderId || o.id.slice(0,8)}</div>
                              <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString('ar-EG')}</div>
                            </div>
                            <div className="mt-1 text-sm text-gray-700">EGP {Number(o.totalAmount||0).toLocaleString()}</div>
                            <div className="mt-1 text-xs text-gray-500">{(o.items||[]).length} عناصر</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* KPIs */}
      {(() => {
        const totalCustomers = filtered.length;
        const totalOrders = (filtered as any[]).reduce((s, c: any) => s + (c.ordersCount || 0), 0);
        const totalSpent = (filtered as any[]).reduce((s, c: any) => s + (c.totalSpent || 0), 0);
        const last = (filtered as any[]).reduce((latest: number, c: any) => {
          const t = c.lastOrder ? new Date(c.lastOrder).getTime() : 0;
          return t > latest ? t : latest;
        }, 0);
        const lastDate = last ? new Date(last).toLocaleDateString('ar-EG') : '-';
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 grid place-items-center"><Users className="w-5 h-5"/></div>
              <div>
                <div className="text-xs text-gray-500">عدد العملاء</div>
                <div className="text-xl font-extrabold text-[#0c1420]">{totalCustomers.toLocaleString()}</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 grid place-items-center"><ShoppingBag className="w-5 h-5"/></div>
              <div>
                <div className="text-xs text-gray-500">عدد الطلبات</div>
                <div className="text-xl font-extrabold text-[#0c1420]">{totalOrders.toLocaleString()}</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 grid place-items-center"><CircleDollarSign className="w-5 h-5"/></div>
              <div>
                <div className="text-xs text-gray-500">إجمالي الإنفاق</div>
                <div className="text-xl font-extrabold text-brand-600">EGP {totalSpent.toLocaleString()}</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 grid place-items-center"><Calendar className="w-5 h-5"/></div>
              <div>
                <div className="text-xs text-gray-500">آخر طلب</div>
                <div className="text-xl font-extrabold text-[#0c1420]">{lastDate}</div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              ref={searchRef}
              className="block w-full pr-10 pl-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-colors"
              placeholder="ابحث بالاسم أو البريد أو الهاتف..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] transition-colors" title="تصدير CSV"><Download className="w-4 h-4"/> CSV</button>
            <button onClick={exportJSON} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] transition-colors" title="تصدير JSON"><Download className="w-4 h-4"/> JSON</button>
            <button onClick={printPage} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] transition-colors" title="طباعة"><Printer className="w-4 h-4"/> طباعة</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-brand-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-bold text-[#0c1420] uppercase tracking-wider cursor-pointer" onClick={() => changeSort('name')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>العميل</span>
                    {sortBy === 'name' ? (dir === 'asc' ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>) : null}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-[#0c1420] uppercase tracking-wider">التواصل</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-[#0c1420] uppercase tracking-wider cursor-pointer" onClick={() => changeSort('orders')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>الطلبات</span>
                    {sortBy === 'orders' ? (dir === 'asc' ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>) : null}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-[#0c1420] uppercase tracking-wider cursor-pointer" onClick={() => changeSort('spent')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>إجمالي الإنفاق</span>
                    {sortBy === 'spent' ? (dir === 'asc' ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>) : null}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-[#0c1420] uppercase tracking-wider cursor-pointer" onClick={() => changeSort('lastOrder')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>آخر طلب</span>
                    {sortBy === 'lastOrder' ? (dir === 'asc' ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>) : null}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">لا توجد بيانات</td></tr>
              ) : (
                paged.map((c: any, idx: number) => (
                  <tr key={c.id} onClick={() => setSelectedCustomer(c)} className={`transition-colors ${idx % 2 ? 'bg-slate-50/40' : 'bg-white'} hover:bg-brand-50/50 cursor-pointer`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <div className="text-right">
                          <div className="text-sm font-bold text-[#0c1420]">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.id.slice(0,8)}</div>
                        </div>
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-brand-100 grid place-items-center text-brand-700 font-extrabold">
                          {(c.name || '?').split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 text-gray-700">
                        {c.email && (
                          <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="hover:text-brand-600 transition-colors" title="إرسال بريد"><Mail className="w-4 h-4"/></a>
                        )}
                        {c.phone && (
                          <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className="hover:text-brand-600 transition-colors" title="اتصال"><Phone className="w-4 h-4"/></a>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 text-right">{c.email}</div>
                      <div className="text-xs text-gray-500 text-right">{c.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[#0c1420]">{c.ordersCount}</td>
                    <td className="px-6 py-4 text-right font-bold text-brand-600">EGP {c.totalSpent.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600">
                      <div className="flex items-center justify-end gap-1">
                        <Calendar className="w-4 h-4 text-gray-400"/>
                        <span>{c.lastOrder ? new Date(c.lastOrder).toLocaleDateString('ar-EG') : '-'}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">صفحة {currentPage} من {totalPages} — {(filtered as any[]).length} عميل</div>
            <div className="flex items-center gap-2">
              <button disabled={currentPage<=1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-2 rounded-xl border-2 border-gray-200 disabled:opacity-50 inline-flex items-center gap-1"><ChevronRight className="w-4 h-4"/> السابق</button>
              <button disabled={currentPage>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))} className="px-3 py-2 rounded-xl border-2 border-gray-200 disabled:opacity-50 inline-flex items-center gap-1">التالي <ChevronLeft className="w-4 h-4"/></button>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="px-3 py-2 rounded-xl border-2 border-gray-200">
                {[10,20,50,100].map(n => <option key={n} value={n}>{n}/صفحة</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
