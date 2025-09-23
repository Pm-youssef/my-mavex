'use client';

import { BarChart3, TrendingUp, Users, ShoppingBag, RefreshCw, LineChart, PieChart, ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react'
import useSWR from 'swr'
import { useMemo, useState, useEffect, useRef } from 'react'
import { formatPrice } from '@/lib/utils'
import { egyptGovernorates } from '@/lib/location-data'

export default function AdminAnalyticsPage() {
  type Order = {
    id: string
    totalAmount: number
    status: string
    createdAt: string
    items: Array<{ quantity: number; price: number; product?: { name?: string } }>
    customerEmail?: string
    customerPhone?: string
  }

  const [range, setRange] = useState<'today' | '7d' | '30d' | '90d' | 'custom'>('7d')
  const [customFrom, setCustomFrom] = useState<string>('')
  const [customTo, setCustomTo] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [govFilter, setGovFilter] = useState<string>('ALL')
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL')
  const [shippingFilter, setShippingFilter] = useState<string>('ALL')

  const { data, error, isLoading, mutate } = useSWR<Order[]>('/api/orders', (url) => fetch(url).then(r => r.json()), {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })

  const now = useMemo(() => new Date(), [])
  const { startDate, endDate } = useMemo(() => {
    if (range === 'custom') {
      const from = customFrom ? new Date(customFrom) : new Date()
      const to = customTo ? new Date(customTo) : new Date()
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      return { startDate: from, endDate: to }
    }
    if (range === 'today') {
      const d = new Date()
      const from = new Date(d)
      from.setHours(0, 0, 0, 0)
      const to = new Date(d)
      to.setHours(23, 59, 59, 999)
      return { startDate: from, endDate: to }
    }
    const d = new Date()
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
    d.setDate(d.getDate() - (days - 1))
    d.setHours(0, 0, 0, 0)
    const to = new Date()
    to.setHours(23, 59, 59, 999)
    return { startDate: d, endDate: to }
  }, [range, customFrom, customTo])

  // Aggregated analytics from server (faster on large datasets)
  type AnalyticsResp = {
    kpis: { totalSales: number; totalOrders: number; avgOrder: number; uniqueCustomers: number }
    series: { days: string[]; salesByDay: number[] }
    distributions: { status: Array<[string, number]> }
    topProducts: Array<{ name: string; qty: number; revenue: number }>
    count: number
  }
  const aggUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('from', startDate.toISOString())
    params.set('to', endDate.toISOString())
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    if (govFilter !== 'ALL') params.set('gov', govFilter)
    if (paymentFilter !== 'ALL') params.set('payment', paymentFilter)
    if (shippingFilter !== 'ALL') params.set('shipping', shippingFilter)
    return `/api/admin/analytics?${params.toString()}`
  }, [startDate, endDate, statusFilter, govFilter, paymentFilter, shippingFilter])
  const { data: aggData } = useSWR<AnalyticsResp>(aggUrl, (url) => fetch(url).then(r => r.json()), {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })

  const orders = useMemo(() => (Array.isArray(data) ? data : []), [data])
  const filtered = useMemo(() => orders.filter(o => {
    const d = new Date(o.createdAt)
    return d >= startDate && d <= endDate
  }), [orders, startDate, endDate])

  const prevStartDate = useMemo(() => {
    const d = new Date(startDate)
    d.setDate(d.getDate() - (range === '7d' ? 7 : range === '30d' ? 30 : 90))
    return d
  }, [startDate, range])
  const previous = useMemo(() => orders.filter(o => new Date(o.createdAt) >= prevStartDate && new Date(o.createdAt) < startDate), [orders, prevStartDate, startDate])

  const fmtDay = (d: Date) => d.toISOString().slice(0, 10)
  const daysList = useMemo(() => {
    const out: string[] = []
    const d = new Date(startDate)
    while (d <= now) {
      out.push(fmtDay(d))
      d.setDate(d.getDate() + 1)
    }
    return out
  }, [startDate, now])

  // Apply advanced filters
  const scoped = useMemo(() => filtered.filter(o => {
    if (statusFilter !== 'ALL' && (o.status || 'PENDING') !== statusFilter) return false
    const gov = (o as any).customerGovernorate || ''
    if (govFilter !== 'ALL' && gov !== govFilter) return false
    const pay = (o as any).paymentMethod || 'COD'
    if (paymentFilter !== 'ALL' && pay !== paymentFilter) return false
    const ship = (o as any).shippingMethod || 'STANDARD'
    if (shippingFilter !== 'ALL' && ship !== shippingFilter) return false
    return true
  }), [filtered, statusFilter, govFilter, paymentFilter, shippingFilter])

  const byDay = useMemo(() => {
    const map = new Map<string, number>()
    scoped.forEach(o => {
      const k = fmtDay(new Date(o.createdAt))
      map.set(k, (map.get(k) || 0) + (Number(o.totalAmount) || 0))
    })
    return daysList.map(k => map.get(k) || 0)
  }, [scoped, daysList])

  const ordersByDay = useMemo(() => {
    const map = new Map<string, number>()
    scoped.forEach(o => {
      const k = fmtDay(new Date(o.createdAt))
      map.set(k, (map.get(k) || 0) + 1)
    })
    return daysList.map(k => map.get(k) || 0)
  }, [scoped, daysList])

  const totalSales = useMemo(() => scoped.reduce((s, o) => s + Number(o.totalAmount || 0), 0), [scoped])
  const totalOrders = scoped.length
  const avgOrder = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0
  const uniqueCustomers = useMemo(() => {
    const set = new Set<string>()
    scoped.forEach(o => set.add((o.customerEmail || o.customerPhone || o.id).toLowerCase()))
    return set.size
  }, [scoped])

  

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>()
    orders.forEach(o => set.add(o.status || 'PENDING'))
    return Array.from(set)
  }, [orders])
  const uniqueGovs = useMemo(() => {
    const set = new Set<string>()
    orders.forEach(o => {
      const g = (o as any).customerGovernorate
      if (g) set.add(g)
    })
    return Array.from(set)
  }, [orders])
  const uniquePayments = useMemo(() => {
    const set = new Set<string>()
    orders.forEach(o => set.add(((o as any).paymentMethod) || 'COD'))
    return Array.from(set)
  }, [orders])
  const uniqueShippings = useMemo(() => {
    const set = new Set<string>()
    orders.forEach(o => set.add(((o as any).shippingMethod) || 'STANDARD'))
    return Array.from(set)
  }, [orders])

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(scoped, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${range}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printPage = () => {
    window.print()
  }

  const buildOrdersLink = () => {
    const params = new URLSearchParams()
    params.set('from', startDate.toISOString())
    params.set('to', endDate.toISOString())
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    if (govFilter !== 'ALL') params.set('gov', govFilter)
    if (paymentFilter !== 'ALL') params.set('payment', paymentFilter)
    if (shippingFilter !== 'ALL') params.set('shipping', shippingFilter)
    return `/admin/orders?${params.toString()}`
  }

  const prevSales = useMemo(() => previous.reduce((s, o) => s + Number(o.totalAmount || 0), 0), [previous])
  const prevOrders = previous.length
  const prevAvg = prevOrders > 0 ? Math.round(prevSales / prevOrders) : 0
  const delta = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0
    return Math.round(((cur - prev) / prev) * 100)
  }

  const salesDelta = delta(totalSales, prevSales)
  const ordersDelta = delta(totalOrders, prevOrders)
  const avgDelta = delta(avgOrder, prevAvg)

  const statusDist = useMemo(() => {
    const map = new Map<string, number>()
    scoped.forEach(o => map.set(o.status || 'PENDING', (map.get(o.status || 'PENDING') || 0) + 1))
    return Array.from(map.entries())
  }, [scoped])

  // Top Products by revenue (with qty)
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>()
    scoped.forEach(o => {
      (o.items || []).forEach((it: any) => {
        const name = it?.product?.name || 'منتج'
        const key = name
        const cur = map.get(key) || { name, qty: 0, revenue: 0 }
        cur.qty += Number(it.quantity || 0)
        cur.revenue += Number((it.price || 0) * (it.quantity || 0))
        map.set(key, cur)
      })
    })
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [scoped])

  const exportCSV = () => {
    const headers = ['id','createdAt','status','totalAmount']
    const rows = filtered.map(o => [o.id, o.createdAt, o.status, String(o.totalAmount)])
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${range}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Prefer server-side aggregated values when present
  const finalDaysList = aggData?.series?.days?.length ? aggData.series.days : daysList
  const finalByDay = aggData?.series?.salesByDay?.length ? aggData.series.salesByDay : byDay
  const finalStatusDist = aggData?.distributions?.status?.length ? aggData.distributions.status : statusDist
  const finalTopProducts = aggData?.topProducts?.length ? aggData.topProducts : topProducts
  const finalTotalSales = typeof aggData?.kpis?.totalSales === 'number' ? aggData!.kpis.totalSales : totalSales
  const finalTotalOrders = typeof aggData?.kpis?.totalOrders === 'number' ? aggData!.kpis.totalOrders : totalOrders
  const finalAvgOrder = typeof aggData?.kpis?.avgOrder === 'number' ? aggData!.kpis.avgOrder : avgOrder
  const finalUniqueCustomers = typeof aggData?.kpis?.uniqueCustomers === 'number' ? aggData!.kpis.uniqueCustomers : uniqueCustomers

  // Today metrics
  const todayKey = fmtDay(new Date())
  const todayIdx = finalDaysList.indexOf(todayKey)
  const todaySales = todayIdx >= 0 ? (finalByDay[todayIdx] || 0) : scoped.filter(o => fmtDay(new Date(o.createdAt)) === todayKey).reduce((s, o) => s + Number(o.totalAmount || 0), 0)
  const todayOrders = scoped.filter(o => fmtDay(new Date(o.createdAt)) === todayKey).length

  const ChartLine = ({ values }: { values: number[] }) => {
    const w = 640, h = 220, pad = 24
    const max = Math.max(1, ...values)
    const step = (w - pad * 2) / Math.max(1, values.length - 1)
    const pts = values.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)])
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
    const gradId = 'grad-' + Math.random().toString(36).slice(2)
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke="#f59e0b" strokeWidth="3" className="[filter:drop-shadow(0_1px_0_rgba(0,0,0,.05))]" />
        {pts.length > 1 && (
          <path d={`${d} L ${pad + (values.length - 1) * step},${h - pad} L ${pad},${h - pad} Z`} fill={`url(#${gradId})`} />
        )}
      </svg>
    )
  }

  const ChartBars = ({ data }: { data: Array<[string, number]> }) => {
    const max = Math.max(1, ...data.map(([, v]) => v))
    return (
      <div className="flex items-end gap-3 h-56">
        {data.map(([k, v]) => (
          <div key={k} className="flex-1 flex flex-col items-center group">
            <div className="w-full bg-brand-200/50 rounded-t-md transition-all duration-500" style={{ height: `${(v / max) * 100}%` }}></div>
            <div className="mt-2 text-xs text-gray-600 font-bold">{k}</div>
            <div className="text-xs text-[#0c1420]">{v}</div>
          </div>
        ))}
      </div>
    )
  }

  const LoadingSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="mt-3 h-8 bg-gray-200 rounded w-32" />
            <div className="mt-2 h-3 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:col-span-2 h-72" />
        <div className="bg-white rounded-2xl border border-gray-200 p-5 h-72" />
      </div>
    </div>
  )

  if (error && (error.status === 401 || (error.message || '').includes('Unauthorized'))) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-gray-600">غير مصرح — يرجى تسجيل الدخول كمسؤول.</p>
        <a href="/admin/login" className="inline-block mt-4 px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 font-bold text-[#0c1420] transition-colors">تسجيل الدخول</a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[#0c1420]">لوحة التحليلات</h1>
          <p className="text-gray-600 mt-1">نظرة عامة على الأداء والمبيعات</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1">
            <button onClick={() => setRange('today')} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${range==='today'?'bg-brand-500 text-[#0c1420]':'text-gray-700 hover:bg-gray-50'}`}>اليوم</button>
            <button onClick={() => setRange('7d')} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${range==='7d'?'bg-brand-500 text-[#0c1420]':'text-gray-700 hover:bg-gray-50'}`}>7 أيام</button>
            <button onClick={() => setRange('30d')} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${range==='30d'?'bg-brand-500 text-[#0c1420]':'text-gray-700 hover:bg-gray-50'}`}>30 يوم</button>
            <button onClick={() => setRange('90d')} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${range==='90d'?'bg-brand-500 text-[#0c1420]':'text-gray-700 hover:bg-gray-50'}`}>90 يوم</button>
            <button onClick={() => setRange('custom')} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${range==='custom'?'bg-brand-500 text-[#0c1420]':'text-gray-700 hover:bg-gray-50'}`}>مخصص</button>
          </div>
          <button onClick={() => mutate()} title="تحديث" className="px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={exportCSV} className="btn-gold-gradient px-3 py-2">Export CSV</button>
          <button onClick={exportJSON} className="px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] font-bold transition-colors">Export JSON</button>
          <button onClick={printPage} className="px-3 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] font-bold transition-colors">طباعة</button>
        </div>
      </div>

      {/* Custom Date Range */}
      {range === 'custom' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-bold text-[#0c1420] mb-1">من تاريخ</label>
            <input type="date" value={customFrom} onChange={(e)=>setCustomFrom(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#0c1420] mb-1">إلى تاريخ</label>
            <input type="date" value={customTo} onChange={(e)=>setCustomTo(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors" />
          </div>
          <div className="flex items-end">
            <a href={buildOrdersLink()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] font-bold transition-colors"><ExternalLink className="w-4 h-4"/> فتح الطلبات</a>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-bold text-[#0c1420] mb-1">الحالة</label>
          <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors">
            <option value="ALL">الكل</option>
            {uniqueStatuses.map(s => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#0c1420] mb-1">المحافظة</label>
          <select value={govFilter} onChange={(e)=>setGovFilter(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors">
            <option value="ALL">الكل</option>
            {egyptGovernorates.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
            {uniqueGovs.filter(g => !egyptGovernorates.find(x=>x.id===g)).map(g => (<option key={g} value={g}>{g}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#0c1420] mb-1">الدفع</label>
          <select value={paymentFilter} onChange={(e)=>setPaymentFilter(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors">
            <option value="ALL">الكل</option>
            {uniquePayments.map(s => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#0c1420] mb-1">الشحن</label>
          <select value={shippingFilter} onChange={(e)=>setShippingFilter(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors">
            <option value="ALL">الكل</option>
            {uniqueShippings.map(s => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <KPI
              title="إيراد اليوم"
              num={todaySales}
              prefix="EGP "
              delta={0}
              icon={<TrendingUp className="w-5 h-5 text-brand-500" />}
            />
            <KPI
              title="إجمالي المبيعات"
              num={finalTotalSales}
              prefix="EGP "
              delta={salesDelta}
              icon={<TrendingUp className="w-5 h-5 text-brand-500" />}
            />
            <KPI
              title="عدد الطلبات"
              num={finalTotalOrders}
              delta={ordersDelta}
              icon={<ShoppingBag className="w-5 h-5 text-brand-500" />}
            />
            <KPI
              title="متوسط الطلب"
              num={finalAvgOrder}
              prefix="EGP "
              delta={avgDelta}
              icon={<BarChart3 className="w-5 h-5 text-brand-500" />}
            />
            <KPI
              title="عملاء مميزون"
              num={finalUniqueCustomers}
              delta={delta(finalUniqueCustomers, finalUniqueCustomers - 1)}
              icon={<Users className="w-5 h-5 text-brand-500" />}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:col-span-2 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[#0c1420] font-extrabold"><LineChart className="w-5 h-5" /> مبيعات يومية</div>
                <div className="text-sm text-gray-500">من {startDate.toLocaleDateString('ar-EG')} إلى {endDate.toLocaleDateString('ar-EG')}</div>
              </div>
              <ChartLine values={finalByDay} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 text-[#0c1420] font-extrabold mb-4"><PieChart className="w-5 h-5" /> توزيع حالات الطلب</div>
              {finalStatusDist.length === 0 ? (
                <div className="h-56 grid place-items-center text-gray-400">لا بيانات</div>
              ) : (
                <div className="cursor-pointer" title="فتح الطلبات المصفّاة" onClick={()=>{ window.location.href = buildOrdersLink() }}>
                  <ChartBars data={finalStatusDist as Array<[string, number]>} />
                </div>
              )}
            </div>
          </div>

          {/* Daily breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[#0c1420] font-extrabold">تفصيل يومي</div>
              <div className="text-sm text-gray-500">{finalDaysList.length} يوم</div>
            </div>
            {finalDaysList.length === 0 ? (
              <div className="h-24 grid place-items-center text-gray-400">لا توجد بيانات</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <colgroup>
                    <col style={{ width: '40%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '40%' }} />
                  </colgroup>
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-gray-500">
                      <th className="text-right pb-2">التاريخ</th>
                      <th className="text-right pb-2">الطلبات</th>
                      <th className="text-right pb-2">الإيرادات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalDaysList.map((d, i) => (
                      <tr key={d} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="py-2 font-bold text-[#0c1420] truncate" title={new Date(d).toLocaleDateString('ar-EG')}>{new Date(d).toLocaleDateString('ar-EG')}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{ordersByDay[i] || 0}</td>
                        <td className="py-2 text-right font-mono tabular-nums">EGP {formatPrice(finalByDay[i] || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[#0c1420] font-extrabold">أفضل المنتجات</div>
              <a href={buildOrdersLink()} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-[#0c1420] text-sm font-bold transition-colors"><ExternalLink className="w-4 h-4"/> فتح الطلبات</a>
            </div>
            {finalTopProducts.length === 0 ? (
              <div className="h-24 grid place-items-center text-gray-400">لا توجد مبيعات في النطاق المحدد</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {finalTopProducts.map((p: { name: string; qty: number; revenue: number }) => (
                  <div key={p.name} className="border border-gray-200 rounded-xl p-4 hover:border-brand-300 transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-[#0c1420] truncate max-w-[70%]" title={p.name}>{p.name}</div>
                      <div className="text-xs text-gray-500">{p.qty} قطعة</div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">الإيراد: <span className="font-bold text-[#0c1420]">EGP {formatPrice(p.revenue)}</span></div>
                    <MiniSparkline orders={scoped} productName={p.name} daysList={finalDaysList} fmtDay={fmtDay} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function MiniSparkline({ orders, productName, daysList, fmtDay }: { orders: any[]; productName: string; daysList: string[]; fmtDay: (d: Date)=>string }) {
  const values = useMemo(() => {
    const map = new Map<string, number>()
    orders.forEach((o: any) => {
      (o.items || []).forEach((it: any) => {
        const name = it?.product?.name || 'منتج'
        if (name !== productName) return
        const k = fmtDay(new Date(o.createdAt))
        map.set(k, (map.get(k) || 0) + Number(it.price || 0) * Number(it.quantity || 0))
      })
    })
    return daysList.map(k => map.get(k) || 0)
  }, [orders, productName, daysList, fmtDay])
  const w = 300, h = 80, pad = 10
  const max = Math.max(1, ...values)
  const step = (w - pad * 2) / Math.max(1, values.length - 1)
  const pts = values.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16">
      <path d={d} fill="none" stroke="#facc15" strokeWidth="2" />
    </svg>
  )
}

function CountUpNumber({ value, prefix }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0)
  const currentRef = useRef(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const from = currentRef.current
    const duration = 800
    const animate = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const cur = Math.round(from + (value - from) * p)
      setDisplay(cur)
      if (p < 1) {
        raf = requestAnimationFrame(animate)
      } else {
        currentRef.current = value
      }
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [value])
  const formatted = prefix ? `${prefix}${formatPrice(display)}` : formatPrice(display)
  return <span>{formatted}</span>
}

function KPI({ title, num, delta, icon, prefix }: { title: string; num: number; delta: number; icon: React.ReactNode; prefix?: string }) {
  const positive = delta >= 0
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 transition-transform duration-300 hover:scale-[1.01]" aria-live="polite">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">{title}</div>
        {icon}
      </div>
      <div className="mt-2 text-3xl font-black text-[#0c1420]">
        <CountUpNumber value={num} prefix={prefix} />
      </div>
      <div className={`mt-1 inline-flex items-center gap-1 text-xs font-bold ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
        {positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        <span>{Math.abs(delta)}%</span>
        <span className="text-gray-500 font-normal">مقارنة بالفترة السابقة</span>
      </div>
    </div>
  )
}
