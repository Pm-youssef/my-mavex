import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Tiny 1x1 transparent PNG (base64) to ensure favicon resolves
// You can replace this later with a real ICO/PNG asset under `public/` or `app/`
const FAVICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

export async function GET() {
  const bytes = Buffer.from(FAVICON_BASE64, 'base64');
  const headers = new Headers();
  headers.set('Content-Type', 'image/png');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new NextResponse(new Uint8Array(bytes), { status: 200, headers });
}

export async function HEAD() {
  return GET();
}
