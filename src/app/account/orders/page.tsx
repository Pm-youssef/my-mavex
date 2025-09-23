"use client";
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from '@/hooks/useSession'

export default function AccountOrdersPage() {
  const { isAuthenticated, loading } = useSession()
  const [orders, setOrders] = useState<any[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    const run = async () => {
      setBusy(true)
      try {
        const res = await fetch('/api/orders/mine', { cache: 'no-store' })
        const json = await res.json()
        setOrders(Array.isArray(json?.orders) ? json.orders : [])
      } catch {
        setOrders([])
      } finally {
        setBusy(false)
      }
    }
    run()
  }, [isAuthenticated])

  if (loading) return <div className="min-h-screen pt-24" />
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24">
        <div className="mavex-container">
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow p-6 text-center">
            <h1 className="text-2xl font-extrabold mb-4">حسابي</h1>
            <p className="text-gray-600 mb-6">انضم لعائلتنا وتابع طلباتك بسهولة ✨</p>
            <div className="flex justify-center gap-3">
              <Link href="/account/login" className="btn-gold-gradient px-5 py-3 rounded-2xl font-extrabold">انضم الآن ✨</Link>
              <Link href="/account/register" className="mavex-button-secondary px-5 py-3 rounded-2xl font-extrabold">إنشاء حساب</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="mavex-container">
        <h1 className="text-3xl font-extrabold text-[#0c1420] mb-8">طلباتي</h1>
        {busy ? (
          <div className="modern-card text-center py-20">جارٍ التحميل…</div>
        ) : orders.length === 0 ? (
          <div className="modern-card text-center py-20">لا توجد طلبات بعد</div>
        ) : (
          <div className="space-y-6">
            {orders.map((o) => (
              <div key={o.id} className="modern-card overflow-hidden">
                <div className="p-4 flex items-center justify-between border-b border-gray-200">
                  <div className="font-extrabold">رقم الطلب: {o.id}</div>
                  <div className="text-gray-600">الإجمالي: {o.totalAmount}</div>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.isArray(o.items) && o.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 border rounded-xl p-2">
                      <div className="relative w-16 h-16 rounded overflow-hidden">
                        <Image src={it.product?.imageUrl || '/img/tshirt-bblue.png'} alt={it.product?.name || 'product'} fill className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{it.product?.name || it.productId}</div>
                        <div className="text-xs text-gray-600">الكمية: {it.quantity} • السعر: {it.price}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
