import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// This route reads from the filesystem; ensure Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Prefer public/img (Next.js static), but keep backward-compat with legacy ./img
const PUBLIC_IMG_DIR = path.join(process.cwd(), 'public', 'img')
const LEGACY_IMG_DIR = path.join(process.cwd(), 'img')

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.png': return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.webp': return 'image/webp'
    case '.gif': return 'image/gif'
    case '.svg': return 'image/svg+xml'
    case '.bmp': return 'image/bmp'
    default: return 'application/octet-stream'
  }
}

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  try {
    const rel = params.path.join('/')
    // Resolve under public/img first, then fallback to legacy ./img
    const tryRoots = [PUBLIC_IMG_DIR, LEGACY_IMG_DIR]
    let chosenRoot: string | null = null
    let abs: string | null = null
    for (const root of tryRoots) {
      const candidate = path.join(root, rel)
      const normalizedRoot = path.normalize(root + path.sep)
      const normalizedAbs = path.normalize(candidate)
      if (!normalizedAbs.startsWith(normalizedRoot)) {
        continue // path traversal attempt; skip
      }
      try {
        const stat = await fs.stat(normalizedAbs)
        if (stat.isFile()) {
          chosenRoot = root
          abs = normalizedAbs
          break
        }
      } catch {}
    }

    if (!abs) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const buf = await fs.readFile(abs)
    const headers = new Headers()
    headers.set('Content-Type', getContentType(abs))
    headers.set('Content-Length', String(buf.length))
    // Cache aggressively for static assets
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    // Use standard Response with Node Buffer body
    return new Response(buf, { status: 200, headers })
  } catch (e: any) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
