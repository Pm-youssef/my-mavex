'use client'

import React, { useCallback, useRef, useState } from 'react'
import Image from 'next/image'

interface AdminUploadInlineProps {
  label?: string
  onUploaded: (url: string) => void
  className?: string
}

interface UploadItem {
  name: string
  url?: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export default function AdminUploadInline({ label = 'رفع صور', onUploaded, className = '' }: AdminUploadInlineProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dirInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<UploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const startUpload = useCallback(async (files: FileList | File[]) => {
    const filesArr = Array.from(files)
    if (filesArr.length === 0) return

    setIsUploading(true)
    // prepare items list
    setItems(filesArr.map(f => ({ name: f.name, status: 'pending' as const })))

    for (let i = 0; i < filesArr.length; i++) {
      const f = filesArr[i]
      setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'uploading' } : it))

      // validations
      if (!f.type.startsWith('image/')) {
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'error', error: 'نوع الملف غير مدعوم' } : it))
        continue
      }
      if (f.size > 5 * 1024 * 1024) {
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'error', error: 'الحجم يتجاوز 5MB' } : it))
        continue
      }

      try {
        const form = new FormData()
        form.append('file', f)
        const res = await fetch('/api/upload', { method: 'POST', body: form })
        if (!res.ok) throw new Error('فشل الرفع')
        const data = await res.json()
        const url = data?.url as string | undefined
        if (!url) throw new Error('رابط غير صالح')

        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'done', url } : it))
        // set the current field value to last uploaded each time; admins can click another if needed
        onUploaded(url)
      } catch (e: any) {
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'error', error: e?.message || 'حدث خطأ' } : it))
      }
    }

    setIsUploading(false)
  }, [onUploaded])

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer?.files
    if (files && files.length) startUpload(files)
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-black">{label}</label>
        {isUploading && <span className="text-xs text-gray-500">جاري الرفع...</span>}
      </div>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) startUpload(e.target.files); e.currentTarget.value = '' }}
      />
      <input
        ref={dirInputRef}
        type="file"
        accept="image/*"
        multiple
        // @ts-ignore - webkitdirectory is supported in Chromium-based browsers
        webkitdirectory=""
        // @ts-ignore - directory attribute hint
        directory=""
        className="hidden"
        onChange={(e) => { if (e.target.files) startUpload(e.target.files); e.currentTarget.value = '' }}
      />

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-yellow-500 hover:text-white border border-gray-300 rounded-lg font-bold disabled:opacity-50"
          disabled={isUploading}
        >
          اختر صور من الجهاز
        </button>
        <button
          type="button"
          onClick={() => dirInputRef.current?.click()}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-yellow-500 hover:text-white border border-gray-300 rounded-lg font-bold disabled:opacity-50"
          disabled={isUploading}
          title="اختر مجلد صور كامل"
        >
          اختر مجلد صور
        </button>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition ${isUploading ? 'border-gray-300 bg-gray-50' : 'border-yellow-400 hover:border-yellow-600 hover:bg-yellow-50'}`}
      >
        <p className="text-sm text-gray-700">اسحب الصور هنا للإضافة السريعة</p>
      </div>

      {/* Uploaded items */}
      {items.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {items.map((it, idx) => (
              <div key={idx} className="border rounded-md p-2 bg-white">
                <div className="text-xs font-bold text-black truncate">{it.name}</div>
                <div className="text-xs mt-1">
                  {it.status === 'pending' && <span className="text-gray-500">بالانتظار</span>}
                  {it.status === 'uploading' && <span className="text-yellow-700">جاري الرفع...</span>}
                  {it.status === 'done' && it.url && (
                    <button
                      type="button"
                      className="text-green-700 hover:underline"
                      onClick={() => onUploaded(it.url!)}
                      title="استخدم هذا الرابط في الحقل"
                    >
                      تم الرفع • انقر للاستخدام
                    </button>
                  )}
                  {it.status === 'error' && <span className="text-red-600">{it.error || 'خطأ'}</span>}
                </div>
                {it.url && (
                  <div className="mt-2">
                    <Image
                      src={it.url}
                      alt={it.name}
                      width={300}
                      height={300}
                      className="w-full h-24 object-cover rounded"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
