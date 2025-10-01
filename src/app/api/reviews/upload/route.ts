import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import os from 'os'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getMimeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'webp': return 'image/webp'
    case 'gif': return 'image/gif'
    case 'svg': return 'image/svg+xml'
    case 'bmp': return 'image/bmp'
    default: return 'application/octet-stream'
  }
}

// Public upload endpoint specifically for product reviews images
// Secured via rate limiting + strict validation. Files are stored under public/uploads/reviews
export async function POST(request: Request) {
  try {
    // Rate limit: 10 uploads per hour per IP for public review uploads
    const rl = rateLimit(request, 'public-review-upload', { limit: 10, windowMs: 60 * 60_000 })
    if (!rl.ok) {
      return NextResponse.json({ error: 'عدد كبير من الطلبات. حاول لاحقًا.' }, { status: 429 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'لم يتم رفع أي ملف' }, { status: 400 })
    }

    // Validate file size (<= 4MB for serverless safety) and ensure it's an image
    const MAX_SIZE = 4 * 1024 * 1024 // 4MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'حجم الملف كبير. الحد الأقصى 4MB' }, { status: 413 })
    }
    if (!file.type || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'يجب أن يكون الملف صورة' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const allowed = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])
    if (!allowed.has(ext)) {
      return NextResponse.json({ error: 'امتداد الملف غير مسموح' }, { status: 400 })
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    // Write to a tmp directory compatible with Vercel serverless (ephemeral)
    const baseTmp = os.tmpdir()
    const uploadDir = path.join(baseTmp, 'uploads', 'reviews')
    await mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, fileName)

    await writeFile(filePath, buffer)

    // Return a base64 data URL so the client can render immediately without relying on shared storage
    const mime = file.type || getMimeFromExt(ext)
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`
    return NextResponse.json({ url: dataUrl })
  } catch (error: any) {
    console.error('POST /api/reviews/upload error:', error?.stack || error?.message || error)
    return NextResponse.json({ error: 'حدث خطأ أثناء رفع الصورة' }, { status: 500 })
  }
}
