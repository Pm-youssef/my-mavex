import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

export async function GET() {
  try {
    const imgDir = path.join(process.cwd(), 'public', 'img')
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')

    const allowed = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'])

    // Helper to read a directory and map files to URLs with a given base path
    const readDirSafe = async (dir: string, baseUrl: string) => {
      try {
        const entries = await fs.readdir(dir)
        return entries
          .filter((f) => allowed.has(path.extname(f).toLowerCase()))
          .map((f) => ({ name: f, url: `${baseUrl}/${f}` }))
      } catch {
        return [] as Array<{ name: string; url: string }>
      }
    }

    const [imgImages, uploadImages] = await Promise.all([
      readDirSafe(imgDir, '/img'),
      readDirSafe(uploadsDir, '/uploads'),
    ])

    const images = [...imgImages, ...uploadImages]

    return NextResponse.json({ images })
  } catch (error) {
    return NextResponse.json({ images: [], error: 'Failed to list images' }, { status: 500 })
  }
}
