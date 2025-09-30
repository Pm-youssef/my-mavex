import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

export const runtime = 'nodejs'

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

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const rel = (params.path || []).join('/')
    if (!rel || rel.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const tryBases = [
      path.join(os.tmpdir(), 'uploads'),
      path.join(process.cwd(), 'public', 'uploads'),
    ]

    for (const base of tryBases) {
      const normalizedBase = path.normalize(base + path.sep)
      const abs = path.normalize(path.join(base, rel))
      if (!abs.startsWith(normalizedBase)) continue
      try {
        const buf = await fs.readFile(abs)
        const headers = new Headers()
        headers.set('Content-Type', getContentType(abs))
        headers.set('Cache-Control', 'public, max-age=31536000, immutable')
        return new NextResponse(new Uint8Array(buf), { status: 200, headers })
      } catch {
        // continue to next base
      }
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
