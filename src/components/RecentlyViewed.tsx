'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import { RECENTLY_VIEWED_STORAGE_KEY } from '@/lib/constants'

export default function RecentlyViewed() {
  const [ids, setIds] = useState<string[]>([])
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY) || '[]'
        const arr = JSON.parse(raw)
        setIds(Array.isArray(arr) ? arr : [])
      } catch {
        setIds([])
      }
    }
    load()
    const handler = () => load()
    window.addEventListener('recentlyViewedUpdated', handler as any)
    return () => window.removeEventListener('recentlyViewedUpdated', handler as any)
  }, [])

  useEffect(() => {
    const run = async () => {
      if (!ids || ids.length === 0) { setItems([]); return }
      try {
        const q = encodeURIComponent(ids.join(','))
        const res = await fetch(`/api/products?ids=${q}`, { cache: 'no-store' })
        const arr = await res.json()
        setItems(Array.isArray(arr) ? arr : [])
      } catch {
        setItems([])
      }
    }
    run()
  }, [ids])

  if (!items || items.length === 0) return null

  return (
    <section className="bg-white text-[#0c1420] py-16">
      <div className="w-full max-w-[140rem] 2xl:max-w-none mx-auto px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <div className="flex items-end justify-between gap-4 mb-10">
          <h2 className="text-3xl md:text-4xl font-black tracking-widest uppercase">شوهد مؤخراً</h2>
          <Link href="/products" className="hidden md:inline-flex items-center gap-2 px-5 py-2 rounded-xl border border-gray-200 hover:border-yellow-500 hover:bg-yellow-50 transition-all">
            عرض جميع المنتجات ↗
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.slice(0, 8).map((p: any, index: number) => (
            <div key={p.id} className="animate-in fade-in-50 slide-in-from-bottom-2 duration-700 motion-reduce:animate-none" style={{ animationDelay: `${index * 60}ms` }}>
              <ProductCard product={p} variant="compact" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
