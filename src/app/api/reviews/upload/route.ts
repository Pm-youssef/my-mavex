import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

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

    // Validate file size (<= 5MB) and ensure it's an image
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'حجم الملف كبير. الحد الأقصى 5MB' }, { status: 413 })
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

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'reviews')
    await mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, fileName)

    await writeFile(filePath, buffer)

    return NextResponse.json({ url: `/uploads/reviews/${fileName}` })
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء رفع الصورة' }, { status: 500 })
  }
}
