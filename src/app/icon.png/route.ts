import { NextResponse } from 'next/server'

// 1x1 transparent PNG placeholder
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YpDPM8AAAAASUVORK5CYII='

export async function GET() {
  const bytes = Buffer.from(PNG_BASE64, 'base64')
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
