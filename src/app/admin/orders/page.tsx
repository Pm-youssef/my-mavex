'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Printer,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  Truck,
  CheckCircle2,
  Clock,
  PackageCheck,
  List,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    imageUrl: string;
  };
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
  subtotal: number;
  shippingCost: number;
  status: string;
  paymentMethod: string;
  shippingMethod: string;
  createdAt: string;
  items: OrderItem[];
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [govFilter, setGovFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [shippingFilter, setShippingFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'order' | 'date' | 'total' | 'customer'>(
    'date'
  );
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [drawerOrder, setDrawerOrder] = useState<Order | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const {
    data: orders = [],
    error,
    isLoading,
  } = useSWR<Order[]>('/api/orders', fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
  });

  const counts = useMemo(() => {
    const base = {
      all: orders.length,
      PENDING: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    } as Record<string, number>;
    orders.forEach(o => {
      base[o.status] = (base[o.status] || 0) + 1;
    });
    return base;
  }, [orders]);

  // Initialize filters from query params (drill-down from analytics)
  useEffect(() => {
    if (!searchParams) return;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const status = searchParams.get('status');
    const gov = searchParams.get('gov');
    const pay = searchParams.get('payment');
    const ship = searchParams.get('shipping');
    if (from) setDateFrom(from);
    if (to) setDateTo(to);
    if (status) setStatusFilter(status);
    if (gov) setGovFilter(gov);
    if (pay) setPaymentFilter(pay);
    if (ship) setShippingFilter(ship);
  }, [searchParams]);

  // (moved keyboard shortcuts effect below after callbacks)

  // Filtered orders (used by sorting/pagination)
  const filteredOrders = useMemo(() => {
    return orders.filter((order: Order) => {
      const matchesSearch =
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.orderId || order.id.slice(-8))
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        order.customerPhone.includes(searchTerm);

      const matchesStatus =
        statusFilter.toLowerCase() === 'all' || order.status === statusFilter;

      const inDateRange = (() => {
        if (!dateFrom && !dateTo) return true;
        const t = new Date(order.createdAt).getTime();
        const fromT = dateFrom ? new Date(dateFrom).getTime() : -Infinity;
        const toT = dateTo ? new Date(dateTo).getTime() : Infinity;
        return t >= fromT && t <= toT;
      })();

      const matchesGov =
        govFilter.toLowerCase() === 'all' ||
        (order.customerGovernorate || '') === govFilter;
      const matchesPayment =
        paymentFilter.toLowerCase() === 'all' ||
        order.paymentMethod === paymentFilter;
      const matchesShipping =
        shippingFilter.toLowerCase() === 'all' ||
        order.shippingMethod === shippingFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        inDateRange &&
        matchesGov &&
        matchesPayment &&
        matchesShipping
      );
    });
  }, [
    orders,
    searchTerm,
    statusFilter,
    dateFrom,
    dateTo,
    govFilter,
    paymentFilter,
    shippingFilter,
  ]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Revalidate the orders data
        mutate('/api/orders');
        toastSuccess({
          title: 'تم تحديث الحالة',
          description: `تم تغيير حالة الطلب إلى ${getStatusText(newStatus)}`,
        });
      } else {
        toastError({
          title: 'فشل تحديث الحالة',
          description: 'تعذّر تحديث حالة الطلب',
        });
      }
    } catch (error) {
      toastError({ title: 'خطأ', description: 'حدث خطأ أثناء تحديث الحالة' });
    } finally {
      setIsUpdating(null);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          mutate('/api/orders');
          toastSuccess({
            title: 'تم الحذف',
            description: 'تم حذف الطلب بنجاح',
          });
        } else {
          toastError({ title: 'فشل الحذف', description: 'تعذّر حذف الطلب' });
        }
      } catch (error) {
        toastError({ title: 'خطأ', description: 'حدث خطأ أثناء حذف الطلب' });
      }
    }
  };

  // Sorting and pagination helpers
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'order') {
        const av = (a.orderId || a.id).toString();
        const bv = (b.orderId || b.id).toString();
        cmp = av.localeCompare(bv, 'ar');
      } else if (sortBy === 'date') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'total') {
        cmp = (a.totalAmount || 0) - (b.totalAmount || 0);
      } else if (sortBy === 'customer') {
        cmp = (a.customerName || '').localeCompare(b.customerName || '', 'ar');
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredOrders, sortBy, dir]);

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, currentPage, pageSize]);

  const changeSort = (k: 'order' | 'date' | 'total' | 'customer') => {
    if (sortBy === k) setDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(k);
      setDir('asc');
    }
  };

  const allSelected = useMemo(() => {
    if (pagedOrders.length === 0) return false;
    return pagedOrders.every(o => selected[o.id]);
  }, [pagedOrders, selected]);

  const toggleSelectAll = () => {
    setSelected(prev => {
      const next = { ...prev } as Record<string, boolean>;
      if (allSelected) {
        pagedOrders.forEach(o => delete next[o.id]);
      } else {
        pagedOrders.forEach(o => (next[o.id] = true));
      }
      return next;
    });
  };

  const bulkUpdate = async (ids: string[], newStatus: string) => {
    if (!ids.length) return;
    try {
      for (const id of ids) {
        await fetch(`/api/orders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
      }
      mutate('/api/orders');
      toastSuccess({
        title: 'تم التحديث الجماعي',
        description: `${ids.length} طلب (${getStatusText(newStatus)})`,
      });
      setSelected({});
    } catch {
      toastError({ title: 'فشل التحديث الجماعي' });
    }
  };

  const bulkDelete = async (ids: string[]) => {
    if (!ids.length) return;
    if (!confirm('حذف الطلبات المحددة؟')) return;
    try {
      for (const id of ids) {
        await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      }
      mutate('/api/orders');
      toastSuccess({
        title: 'تم حذف الطلبات',
        description: `${ids.length} طلب`,
      });
      setSelected({});
    } catch {
      toastError({ title: 'فشل حذف الطلبات' });
    }
  };

  const exportOrders = useCallback(() => {
    const csvContent = [
      [
        'رقم الطلب',
        'اسم العميل',
        'البريد الإلكتروني',
        'الهاتف',
        'العنوان',
        'المجموع الفرعي',
        'الشحن',
        'المجموع الكلي',
        'طريقة الدفع',
        'طريقة الشحن',
        'الحالة',
        'التاريخ',
      ],
      ...orders
        .filter(order => {
          const matchesSearch =
            order.customerName
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            order.customerEmail
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            (order.orderId || order.id.slice(-8))
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            order.customerPhone.includes(searchTerm);

          const matchesStatus =
            statusFilter === 'all' || order.status === statusFilter;

          return matchesSearch && matchesStatus;
        })
        .map(order => [
          order.orderId || order.id.slice(-8),
          order.customerName,
          order.customerEmail,
          order.customerPhone,
          `${order.customerAddress || ''} ${order.customerCity || ''} ${
            order.customerGovernorate || ''
          }`.trim(),
          order.subtotal?.toString() || '0',
          order.shippingCost?.toString() || '0',
          order.totalAmount.toString(),
          order.paymentMethod === 'COD'
            ? 'الدفع عند الاستلام'
            : order.paymentMethod,
          order.shippingMethod === 'EXPRESS' ? 'الشحن السريع' : 'الشحن القياسي',
          order.status,
          new Date(order.createdAt).toLocaleDateString('ar-EG'),
        ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [orders, searchTerm, statusFilter]);

  const exportOrdersJSON = useCallback(() => {
    // compute filtered locally to avoid referencing variables declared later
    const filtered = orders
      .filter(order => {
        const matchesSearch =
          order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customerEmail
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (order.orderId || order.id.slice(-8))
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          order.customerPhone.includes(searchTerm);

        const matchesStatus =
          statusFilter.toLowerCase() === 'all' || order.status === statusFilter;

        const inDateRange = (() => {
          if (!dateFrom && !dateTo) return true;
          const t = new Date(order.createdAt).getTime();
          const fromT = dateFrom ? new Date(dateFrom).getTime() : -Infinity;
          const toT = dateTo ? new Date(dateTo).getTime() : Infinity;
          return t >= fromT && t <= toT;
        })();

        const matchesGov =
          govFilter.toLowerCase() === 'all' ||
          (order.customerGovernorate || '') === govFilter;
        const matchesPayment =
          paymentFilter.toLowerCase() === 'all' ||
          order.paymentMethod === paymentFilter;
        const matchesShipping =
          shippingFilter.toLowerCase() === 'all' ||
          order.shippingMethod === shippingFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          inDateRange &&
          matchesGov &&
          matchesPayment &&
          matchesShipping
        );
      })
      .map(o => ({
        id: o.id,
        orderId: o.orderId,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerPhone: o.customerPhone,
        address: `${o.customerAddress || ''} ${o.customerCity || ''} ${
          o.customerGovernorate || ''
        }`.trim(),
        subtotal: o.subtotal,
        shippingCost: o.shippingCost,
        totalAmount: o.totalAmount,
        paymentMethod: o.paymentMethod,
        shippingMethod: o.shippingMethod,
        status: o.status,
        createdAt: o.createdAt,
        items: o.items,
      }));
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orders-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }, [
    orders,
    searchTerm,
    statusFilter,
    dateFrom,
    dateTo,
    govFilter,
    paymentFilter,
    shippingFilter,
  ]);

  // Keyboard shortcuts: r refresh, f focus search, e export csv, Delete delete selected
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'r') {
        mutate('/api/orders');
      } else if (k === 'f') {
        searchRef.current?.focus();
      } else if (k === 'e') {
        exportOrders();
      } else if (e.key === 'Delete') {
        const ids = Object.keys(selected).filter(id => selected[id]);
        if (ids.length) bulkDelete(ids);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, exportOrders]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 border-green-500';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800 border-blue-500';
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-500';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-500';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'في الانتظار';
      case 'PROCESSING':
        return 'قيد المعالجة';
      case 'SHIPPED':
        return 'تم الشحن';
      case 'DELIVERED':
        return 'تم التوصيل';
      case 'CANCELLED':
        return 'ملغي';
      default:
        return status;
    }
  };

  // Unique option lists for filters
  const govOptions = useMemo(
    () =>
      Array.from(
        new Set((orders || []).map(o => o.customerGovernorate).filter(Boolean))
      ) as string[],
    [orders]
  );
  const paymentOptions = useMemo(
    () =>
      Array.from(
        new Set((orders || []).map(o => o.paymentMethod).filter(Boolean))
      ) as string[],
    [orders]
  );
  const shippingOptions = useMemo(
    () =>
      Array.from(
        new Set((orders || []).map(o => o.shippingMethod).filter(Boolean))
      ) as string[],
    [orders]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32">
        <div className="mavex-container">
          <div className="text-center py-20">
            <div className="mavex-loading h-32 w-32 mx-auto"></div>
            <p className="mt-8 text-gray-600 text-xl font-medium">
              جاري تحميل الطلبات...
            </p>
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
            <p className="text-red-600 text-xl font-medium">
              حدث خطأ في تحميل الطلبات
            </p>
            <button
              onClick={() => mutate('/api/orders')}
              className="mt-4 bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700"
            >
              إعادة المحاولة
            </button>
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
            <div className="text-xs uppercase tracking-widest text-white/60 mb-1">
              لوحة الإدارة
            </div>
            <h1 className="text-2xl md:text-3xl font-black leading-tight">
              إدارة الطلبات
            </h1>
            <p className="text-white/70 mt-1">عرض وإدارة جميع طلبات العملاء</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] bg-white font-bold"
            >
              العودة
            </Link>
            {orders.length > 0 && (
              <>
                <button
                  onClick={exportOrders}
                  className="btn-gold-gradient px-4 py-2 inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button
                  onClick={exportOrdersJSON}
                  className="btn-gold-gradient px-4 py-2 inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> JSON
                </button>
                <button
                  onClick={() => window.print()}
                  className="btn-gold-gradient px-4 py-2 inline-flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> طباعة
                </button>
              </>
            )}
            <button
              onClick={() => mutate('/api/orders')}
              className="btn-gold-gradient px-4 py-2 inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> تحديث
            </button>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: 'all', label: 'الكل', count: counts.all, icon: <List className="w-4 h-4"/> },
            { key: 'PENDING', label: 'في الانتظار', count: counts.PENDING, icon: <Clock className="w-4 h-4"/> },
            { key: 'PROCESSING', label: 'قيد المعالجة', count: counts.PROCESSING, icon: <PackageCheck className="w-4 h-4"/> },
            { key: 'SHIPPED', label: 'تم الشحن', count: counts.SHIPPED, icon: <Truck className="w-4 h-4"/> },
            { key: 'DELIVERED', label: 'تم التوصيل', count: counts.DELIVERED, icon: <CheckCircle2 className="w-4 h-4"/> },
            { key: 'CANCELLED', label: 'ملغي', count: counts.CANCELLED, icon: <X className="w-4 h-4"/> },
          ] as Array<{ key: string; label: string; count: number; icon: React.ReactNode }>
        ).map(t => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key as any)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-bold ${
              statusFilter === t.key
                ? 'border-brand-500 bg-brand-50 text-[#0c1420]'
                : 'border-gray-200 hover:border-brand-500 hover:bg-brand-50'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
            <span className="ml-1 text-gray-500">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        {/* Row 1: Search */}
        <div className="relative min-w-0 mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث بالاسم، البريد الإلكتروني، رقم الطلب، أو الهاتف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            ref={searchRef}
            className="w-full pr-10 pl-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors"
          />
        </div>
        {/* Row 2: Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="pr-10 pl-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors appearance-none"
            >
              <option value="all">جميع الحالات</option>
              <option value="PENDING">في الانتظار</option>
              <option value="PROCESSING">قيد المعالجة</option>
              <option value="SHIPPED">تم الشحن</option>
              <option value="DELIVERED">تم التوصيل</option>
              <option value="CANCELLED">ملغي</option>
            </select>
          </div>
          <select
            value={govFilter}
            onChange={e => setGovFilter(e.target.value)}
            className="px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          >
            <option value="all">كل المحافظات</option>
            {govOptions.map(g => (
              <option key={g} value={g as string}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          >
            <option value="all">كل طرق الدفع</option>
            {paymentOptions.map(p => (
              <option key={p} value={p as string}>
                {p === 'COD' ? 'الدفع عند الاستلام' : p}
              </option>
            ))}
          </select>
          <select
            value={shippingFilter}
            onChange={e => setShippingFilter(e.target.value)}
            className="px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          >
            <option value="all">كل طرق الشحن</option>
            {shippingOptions.map(s => (
              <option key={s} value={s as string}>
                {s === 'EXPRESS' ? 'الشحن السريع' : 'الشحن القياسي'}
              </option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-500">نتائج: {filteredOrders.length}</span>
            <button
              onClick={() => {
                setStatusFilter('all');
                setGovFilter('all');
                setPaymentFilter('all');
                setShippingFilter('all');
                setDateFrom('');
                setDateTo('');
                setSearchTerm('');
              }}
              className="btn-gold-gradient px-4 py-2"
            >
              إعادة ضبط
            </button>
          </div>
        </div>
        {/* Optional: date range placeholders (kept state-ready) */}
          {/* <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200" /> */}
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="modern-card text-center py-20">
            <div className="w-32 h-32 mx-auto mb-8 text-gray-300">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-gray-600 text-xl font-medium mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'لا توجد نتائج للبحث'
                : 'لا توجد طلبات بعد'}
            </p>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'جرب تغيير معايير البحث'
                : 'ستظهر الطلبات هنا عندما يقوم العملاء بالطلب'}
            </p>
          </div>
        ) : (
          <div className="modern-card overflow-hidden">
            {/* Bulk actions */}
            <div className="flex flex-wrap items-center gap-2 p-4 border-b border-gray-200">
              <label className="flex items-center gap-2 text-sm font-bold text-black">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
                تحديد الكل (
                {Object.keys(selected).filter(id => selected[id]).length}/
                {pagedOrders.length})
              </label>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() =>
                    bulkUpdate(
                      Object.keys(selected).filter(id => selected[id]),
                      'PROCESSING'
                    )
                  }
                  className="px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-sm font-bold"
                >
                  قيد المعالجة
                </button>
                <button
                  onClick={() =>
                    bulkUpdate(
                      Object.keys(selected).filter(id => selected[id]),
                      'SHIPPED'
                    )
                  }
                  className="px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-sm font-bold"
                >
                  تم الشحن
                </button>
                <button
                  onClick={() =>
                    bulkUpdate(
                      Object.keys(selected).filter(id => selected[id]),
                      'DELIVERED'
                    )
                  }
                  className="px-3 py-2 rounded-xl border-2 border-emerald-200 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50 text-sm font-bold"
                >
                  تم التوصيل
                </button>
                <button
                  onClick={() =>
                    bulkUpdate(
                      Object.keys(selected).filter(id => selected[id]),
                      'CANCELLED'
                    )
                  }
                  className="px-3 py-2 rounded-xl border-2 border-rose-200 text-rose-700 hover:border-rose-500 hover:bg-rose-50 text-sm font-bold"
                >
                  إلغاء
                </button>
                <button
                  onClick={() =>
                    bulkDelete(Object.keys(selected).filter(id => selected[id]))
                  }
                  className="px-3 py-2 rounded-xl border-2 border-red-200 text-red-700 hover:border-red-500 hover:bg-red-50 text-sm font-bold inline-flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> حذف المحدد
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <colgroup>
                  <col style={{ width: '48px' }} />
                  <col style={{ width: '140px' }} />
                  <col />
                  <col />
                  <col />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '120px' }} />
                </colgroup>
                <thead className="bg-[#0c1420] sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-bold text-white">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th
                      className="px-6 py-4 text-right text-lg font-bold text-white cursor-pointer"
                      onClick={() => changeSort('order')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>رقم الطلب</span>
                        {sortBy === 'order' ? (
                          dir === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : null}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-right text-lg font-bold text-white cursor-pointer"
                      onClick={() => changeSort('customer')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>العميل</span>
                        {sortBy === 'customer' ? (
                          dir === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : null}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right text-lg font-bold text-white">
                      العنوان
                    </th>
                    <th className="px-6 py-4 text-right text-lg font-bold text-white">
                      المنتجات
                    </th>
                    <th
                      className="px-6 py-4 text-right text-lg font-bold text-white cursor-pointer"
                      onClick={() => changeSort('total')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>المبالغ</span>
                        {sortBy === 'total' ? (
                          dir === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : null}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right text-lg font-bold text-white">
                      طرق الدفع والشحن
                    </th>
                    <th
                      className="px-6 py-4 text-right text-lg font-bold text-white cursor-pointer"
                      onClick={() => changeSort('date')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>التاريخ</span>
                        {sortBy === 'date' ? (
                          dir === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : null}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right text-lg font-bold text-white">
                      الحالة
                    </th>
                    <th className="px-6 py-4 text-right text-lg font-bold text-white">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {pagedOrders.map((order, idx) => (
                    <tr
                      key={order.id}
                      className={`transition-colors ${
                        idx % 2 ? 'bg-slate-50/40' : 'bg-white'
                      } hover:bg-brand-50/50`}
                      onClick={() => setDrawerOrder(order)}
                    >
                      <td
                        className="px-4 py-4 whitespace-nowrap"
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={!!selected[order.id]}
                          onChange={e =>
                            setSelected(s => ({
                              ...s,
                              [order.id]: e.target.checked,
                            }))
                          }
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-black font-mono tabular-nums">
                          #{order.orderId || order.id.slice(-8)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="max-w-[240px]">
                          <div className="text-lg font-bold text-black truncate" title={order.customerName}>
                            {order.customerName}
                          </div>
                          <div className="text-base text-gray-600 truncate" title={order.customerEmail}>
                            {order.customerEmail}
                          </div>
                          <div className="text-base text-gray-600 truncate" title={order.customerPhone}>
                            {order.customerPhone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-[320px]">
                          {order.customerAddress && (
                            <div className="truncate" title={order.customerAddress}>{order.customerAddress}</div>
                          )}
                          {order.customerCity && (
                            <div className="truncate" title={order.customerCity}>{order.customerCity}</div>
                          )}
                          {order.customerGovernorate && (
                            <div className="truncate" title={order.customerGovernorate}>{order.customerGovernorate}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2 max-w-[360px]">
                          {order.items.map(item => (
                            <div
                              key={item.id}
                              className="flex items-center space-x-2 space-x-reverse"
                            >
                              <span className="text-sm font-bold text-black truncate max-w-[220px]" title={item.product.name}>
                                {item.product.name}
                              </span>
                              <span className="text-sm text-gray-600">
                                × {item.quantity}
                              </span>
                              <span className="text-sm text-gray-600 font-mono tabular-nums">
                                ({formatPrice(item.price)})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1 text-right">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">الفرعي:</span>
                            <span className="text-sm font-bold font-mono tabular-nums">{formatPrice(order.subtotal || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">الشحن:</span>
                            <span className="text-sm font-bold font-mono tabular-nums">{formatPrice(order.shippingCost || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between border-t pt-1">
                            <span className="text-lg font-bold text-black">المجموع:</span>
                            <span className="text-lg font-bold text-brand-600 font-mono tabular-nums">{formatPrice(order.totalAmount)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-800 border border-brand-500`}
                          >
                            {order.paymentMethod === 'COD'
                              ? 'الدفع عند الاستلام'
                              : order.paymentMethod}
                          </span>
                          <div className="text-xs text-gray-600">
                            {order.shippingMethod === 'EXPRESS'
                              ? 'الشحن السريع'
                              : 'الشحن القياسي'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono tabular-nums">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={order.status}
                          onChange={e =>
                            updateOrderStatus(order.id, e.target.value)
                          }
                          disabled={isUpdating === order.id}
                          className={`px-3 py-1 text-sm font-bold rounded-full cursor-pointer border transition-all duration-300 ${getStatusColor(
                            order.status
                          )}`}
                        >
                          <option value="PENDING">في الانتظار</option>
                          <option value="PROCESSING">قيد المعالجة</option>
                          <option value="SHIPPED">تم الشحن</option>
                          <option value="DELIVERED">تم التوصيل</option>
                          <option value="CANCELLED">ملغي</option>
                        </select>
                        {isUpdating === order.id && (
                          <div className="mt-1">
                            <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-3">
                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="text-red-600 hover:text-red-800 transition-all duration-300 transform hover:scale-110"
                            title="حذف الطلب"
                          >
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                صفحة {currentPage} من {totalPages} — {sortedOrders.length} نتيجة
              </div>
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
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl border-2 border-gray-200"
                >
                  {[10, 20, 50, 100].map(n => (
                    <option key={n} value={n}>
                      {n}/صفحة
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {filteredOrders.length > 0 && (
          <div className="modern-card mt-16">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 text-center">
              <div className="group interactive-element">
                <div className="text-4xl font-bold text-black mb-3 group-hover:text-brand-600 transition-colors duration-500">
                  {filteredOrders.length}
                </div>
                <div className="text-lg text-gray-600 font-medium">
                  إجمالي الطلبات
                </div>
              </div>
              <div className="group interactive-element">
                <div className="text-4xl font-bold text-emerald-600 mb-3 group-hover:text-emerald-700 transition-colors duration-500">
                  {
                    filteredOrders.filter(
                      (o: Order) => o.status === 'DELIVERED'
                    ).length
                  }
                </div>
                <div className="text-lg text-gray-600 font-medium">مكتملة</div>
              </div>
              <div className="group interactive-element">
                <div className="text-4xl font-bold text-brand-600 mb-3 group-hover:text-brand-700 transition-colors duration-500">
                  {
                    filteredOrders.filter((o: Order) => o.status === 'PENDING')
                      .length
                  }
                </div>
                <div className="text-lg text-gray-600 font-medium">
                  في الانتظار
                </div>
              </div>
              <div className="group interactive-element">
                <div className="text-4xl font-bold text-blue-600 mb-3 group-hover:text-blue-700 transition-colors duration-500">
                  {
                    filteredOrders.filter((o: Order) => o.status === 'SHIPPED')
                      .length
                  }
                </div>
                <div className="text-lg text-gray-600 font-medium">
                  تم الشحن
                </div>
              </div>
              <div className="group interactive-element">
                <div className="text-4xl font-bold text-brand-600 mb-3 group-hover:text-brand-700 transition-colors duration-500">
                  {formatPrice(
                    filteredOrders.reduce(
                      (sum: number, order: Order) => sum + order.totalAmount,
                      0
                    )
                  )}
                </div>
                <div className="text-lg text-gray-600 font-medium">
                  إجمالي المبيعات
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Order Detail Drawer */}
      {drawerOrder && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOrder(null)} />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl border-l border-gray-200 p-6 overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-gray-500">تفاصيل الطلب</div>
                <div className="text-2xl font-black text-[#0c1420] mt-1">#{drawerOrder.orderId || drawerOrder.id.slice(-8)}</div>
                <div className="text-sm text-gray-500">{formatDate(drawerOrder.createdAt)}</div>
              </div>
              <button onClick={() => setDrawerOrder(null)} className="px-3 py-1.5 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50">إغلاق</button>
            </div>

            {/* Customer */}
            <div className="border-2 border-gray-200 rounded-xl p-4 mb-4">
              <div className="font-extrabold text-[#0c1420] mb-1 flex items-center gap-2"><List className="w-4 h-4"/> العميل</div>
              <div className="text-black font-bold">{drawerOrder.customerName}</div>
              <div className="flex items-center gap-2 text-gray-600 mt-1"><Mail className="w-4 h-4"/> {drawerOrder.customerEmail}</div>
              <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4"/> {drawerOrder.customerPhone}</div>
              <div className="flex items-start gap-2 text-gray-600 mt-1"><MapPin className="w-4 h-4 mt-0.5"/> <span>{[drawerOrder.customerAddress, drawerOrder.customerCity, drawerOrder.customerGovernorate].filter(Boolean).join('، ')}</span></div>
            </div>

            {/* Items */}
            <div className="border-2 border-gray-200 rounded-xl p-4 mb-4">
              <div className="font-extrabold text-[#0c1420] mb-2 flex items-center gap-2"><PackageCheck className="w-4 h-4"/> المنتجات ({drawerOrder.items?.length || 0})</div>
              <div className="space-y-2">
                {(drawerOrder.items || []).map((it) => (
                  <div key={it.id} className="flex items-center justify-between text-sm">
                    <div className="font-bold text-black truncate max-w-[60%]" title={it.product?.name}>{it.product?.name}</div>
                    <div className="text-gray-600">× {it.quantity}</div>
                    <div className="font-mono tabular-nums">{formatPrice(it.price)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amounts */}
            <div className="border-2 border-gray-200 rounded-xl p-4 mb-4">
              <div className="font-extrabold text-[#0c1420] mb-2">المبالغ</div>
              <div className="flex items-center justify-between text-sm"><span className="text-gray-600">الفرعي</span><span className="font-mono tabular-nums font-bold">{formatPrice(drawerOrder.subtotal || 0)}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-gray-600">الشحن</span><span className="font-mono tabular-nums font-bold">{formatPrice(drawerOrder.shippingCost || 0)}</span></div>
              <div className="flex items-center justify-between border-t pt-2 mt-2"><span className="text-lg font-bold text-black">الإجمالي</span><span className="text-lg font-bold text-brand-600 font-mono tabular-nums">{formatPrice(drawerOrder.totalAmount)}</span></div>
            </div>

            {/* Status & actions */}
            <div className="border-2 border-gray-200 rounded-xl p-4 mb-4">
              <div className="font-extrabold text-[#0c1420] mb-2">الحالة</div>
              <div className="flex flex-wrap items-center gap-2">
                <button className="px-3 py-1.5 rounded-full border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-sm" onClick={()=>updateOrderStatus(drawerOrder.id, 'PENDING')}>في الانتظار</button>
                <button className="px-3 py-1.5 rounded-full border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-sm" onClick={()=>updateOrderStatus(drawerOrder.id, 'PROCESSING')}>قيد المعالجة</button>
                <button className="px-3 py-1.5 rounded-full border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-sm" onClick={()=>updateOrderStatus(drawerOrder.id, 'SHIPPED')}>تم الشحن</button>
                <button className="px-3 py-1.5 rounded-full border-2 border-emerald-300 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50 text-sm" onClick={()=>updateOrderStatus(drawerOrder.id, 'DELIVERED')}>تم التوصيل</button>
                <button className="px-3 py-1.5 rounded-full border-2 border-rose-300 text-rose-700 hover:border-rose-500 hover:bg-rose-50 text-sm" onClick={()=>updateOrderStatus(drawerOrder.id, 'CANCELLED')}>ملغي</button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                className="btn-gold-gradient px-4 py-2"
                onClick={()=>{
                  const blob = new Blob([JSON.stringify(drawerOrder, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob); const a = document.createElement('a');
                  a.href=url; a.download=`order-${drawerOrder.orderId || drawerOrder.id}.json`; a.click(); URL.revokeObjectURL(url);
                }}
              >تصدير JSON</button>
              <button className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50" onClick={()=>window.print()}>طباعة</button>
              <button className="px-4 py-2 rounded-xl border-2 border-red-300 text-red-700 hover:border-red-500 hover:bg-red-50" onClick={()=>{ if (confirm('حذف الطلب؟')) deleteOrder(drawerOrder.id); }}>حذف</button>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}
