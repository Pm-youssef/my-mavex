'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { FALLBACK_IMAGE_URL } from '@/lib/constants'

type ImageItem = { name: string; url: string }

interface Props {
  label: string
  value: string
  onChange: (url: string) => void
  placeholder?: string
}

export default function LocalImagePicker({ label, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<ImageItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let ignore = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/images')
        if (!res.ok) throw new Error('Failed to fetch images')
        const data = (await res.json()) as { images?: ImageItem[] }
        if (!ignore) setImages(Array.isArray(data.images) ? data.images : [])
      } catch (e:any) {
        if (!ignore) setError(e?.message || 'حدث خطأ')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [open])

  return (
    <div className="space-y-3">
      <label className="mavex-label text-black">{label}</label>
      <div className="flex gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mavex-input flex-1 focus:border-brand-500 focus:ring-brand-200"
          placeholder={placeholder || 'مثال: /img/tshirt.png أو https://...'}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="px-4 py-2 bg-gray-100 hover:bg-yellow-500 hover:text-white border border-gray-300 rounded-lg font-bold"
        >
          {open ? 'إغلاق' : 'اختر من المعرض'}
        </button>
      </div>

      {value ? (
        <div className="flex items-center gap-3">
          {/* preview selected image */}
          <div className="relative w-20 h-20 border rounded overflow-hidden">
            <Image
              src={value || FALLBACK_IMAGE_URL}
              alt={label}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-sm text-red-600 hover:underline"
          >
            مسح
          </button>
        </div>
      ) : null}

      {open && (
        <div className="border rounded-lg p-3 bg-white">
          {loading ? (
            <p className="text-sm text-gray-600">جاري التحميل...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-gray-600">لا توجد صور في المجلدين public/img أو public/uploads</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {images.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => {
                    onChange(img.url)
                    setOpen(false)
                  }}
                  className={`group border rounded-xl overflow-hidden hover:ring-2 hover:ring-brand-500 transition ${
                    value === img.url ? 'ring-2 ring-brand-500' : ''
                  }`}
                  title={img.name}
                >
                  <div className="relative w-full aspect-square">
                    <Image
                      src={img.url}
                      alt={img.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="px-2 py-1 text-xs text-gray-700 truncate text-left">{img.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
