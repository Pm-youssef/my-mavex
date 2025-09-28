import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const ROOT_IMG_DIR = path.join(process.cwd(), 'img');

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.bmp':
      return 'image/bmp';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const rel = params.path.join('/');
    const abs = path.join(ROOT_IMG_DIR, rel);

    // Prevent path traversal
    const normalizedRoot = path.normalize(ROOT_IMG_DIR + path.sep);
    const normalizedAbs = path.normalize(abs);
    if (!normalizedAbs.startsWith(normalizedRoot)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const buf = await fs.readFile(abs);
    const headers = new Headers();
    headers.set('Content-Type', getContentType(abs));
    // Cache aggressively for static assets
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new NextResponse(new Uint8Array(buf), { status: 200, headers });
  } catch (e: any) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
