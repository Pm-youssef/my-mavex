'use client'

import { useEffect, useState, useCallback } from 'react'
import ProductCard from '@/components/ProductCard'
import { FAVORITES_STORAGE_KEY } from '@/lib/constants'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { toastSuccess, toastInfo } from '@/components/ui/Toast'

interface Product {
  id: string
  name: string
  description: string
  originalPrice: number
  discountedPrice: number
  imageUrl: string
  thumbnailUrl?: string | null
  hoverImageUrl?: string | null
  stock: number
}

export default function FavoritesPage() {
  const [loading, setLoading] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [removingIds, setRemovingIds] = useState<string[]>([])

  const loadFavorites = useCallback(async () => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
      const ids: string[] = raw ? JSON.parse(raw) : []
      setFavoriteIds(Array.isArray(ids) ? ids : [])

      if (!ids || ids.length === 0) {
        setProducts([])
        setLoading(false)
        return
      }

      const res = await fetch('/api/products')
      const all: Product[] = await res.json()
      const filtered = all.filter(p => ids.includes(p.id))
      // Preserve the order of ids as added by the user
      filtered.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
      setProducts(filtered)
    } catch (e) {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFavorites()

    const handleFavUpdate = () => loadFavorites()
    const handleStorage = () => loadFavorites()

    window.addEventListener('favoritesUpdated', handleFavUpdate as any)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('favoritesUpdated', handleFavUpdate as any)
      window.removeEventListener('storage', handleStorage)
    }
  }, [loadFavorites])

  const removeFromFavorites = (id: string) => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
      const ids: string[] = raw ? JSON.parse(raw) : []
      const next = ids.filter(x => x !== id)
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('favoritesUpdated'))
      setFavoriteIds(next)
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-8 text-[#0c1420] text-xl font-medium">جاري تحميل المفضلة...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-12">
      <div className="max-w-[90rem] mx-auto px-3 sm:px-4 lg:px-6">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0c1420]">المفضلة</h1>
            <p className="text-sm text-gray-500 mt-1">{products.length} منتج</p>
          </div>
          {favoriteIds.length > 0 && (
            <button
              onClick={() => {
                const ok = window.confirm('هل تريد مسح جميع عناصر المفضلة؟')
                if (!ok) return
                localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([]))
                window.dispatchEvent(new CustomEvent('favoritesUpdated'))
                setFavoriteIds([])
                setProducts([])
                toastInfo({ title: 'تم المسح', description: 'تم مسح عناصر المفضلة بنجاح' })
              }}
              className="inline-flex items-center gap-2 text-sm font-extrabold rounded-full px-4 py-2 border-2 border-rose-300 text-rose-700 hover:text-white hover:bg-rose-600 hover:border-rose-600 transition-all shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              مسح الكل
            </button>
          )}
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#0c1420] text-lg mb-6">لا توجد منتجات في المفضلة بعد.</p>
            <Link
              href="/products"
              className="inline-block bg-yellow-500 hover:bg-yellow-600 text-[#0c1420] font-bold px-6 py-3 rounded-xl border-2 border-yellow-500 hover:border-yellow-600 transition-all duration-200"
            >
              تصفح المنتجات
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(p => (
              <div
                key={p.id}
                className={`relative group transition-all duration-300 ease-out ${
                  removingIds.includes(p.id) ? 'opacity-0 translate-y-2 scale-[0.98]' : 'opacity-100'
                }`}
              >
                <ProductCard product={p} hideActions />
                <button
                  className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-full px-3 py-1.5 text-xs font-extrabold shadow-md backdrop-blur-sm transition-colors"
                  onClick={() => {
                    setRemovingIds((prev) => Array.from(new Set([...prev, p.id])))
                    setTimeout(() => {
                      removeFromFavorites(p.id)
                      setRemovingIds((prev) => prev.filter((id) => id !== p.id))
                      toastSuccess({ title: 'تم الحذف', description: 'تمت إزالة المنتج من المفضلة' })
                    }, 260)
                  }}
                  title="حذف من المفضلة"
                  aria-label="حذف من المفضلة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
