import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Expand Arabic synonyms and common variants/transliterations
function expandQuery(q: string): string[] {
  const s = (q || '').trim()
  if (!s) return []
  const base = s.toLowerCase()
  const tokens = new Set<string>([base])

  const pairs: Array<[RegExp, string]> = [
    [/تيشيرت|تيشرت|تشيرت|تشيرت/i, 'tshirt'],
    [/قميص|قمصان/i, 'shirt'],
    [/رجالي|رجال|للرجال|رجاليه/i, 'men'],
    [/نسائي|نساء|حريمي|للنساء/i, 'women'],
    [/اطفال|أطفال|ولد|بنات/i, 'kids'],
  ]
  for (const [re, rep] of pairs) {
    if (re.test(base)) tokens.add(rep)
  }
  // split on spaces to include individual words
  base.split(/\s+/).forEach(w => w && tokens.add(w))
  return Array.from(tokens).slice(0, 12)
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const q = url.searchParams.get('q') || url.searchParams.get('query') || ''
    const take = Math.min(24, Math.max(1, Number(url.searchParams.get('limit') || '12') || 12))

    const expanded = expandQuery(q)
    // Attempt Meilisearch
    const meiliHost = process.env.MEILI_URL || ''
    const meiliKey = process.env.MEILI_KEY || ''
    if (meiliHost && meiliKey) {
      try {
        const resp = await fetch(`${meiliHost.replace(/\/$/, '')}/indexes/products/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${meiliKey}` },
          body: JSON.stringify({ q, limit: take }),
        })
        if (resp.ok) {
          const j = await resp.json()
          const hits = Array.isArray(j?.hits) ? j.hits : []
          return NextResponse.json({ source: 'meilisearch', items: hits })
        }
      } catch {}
    }

    // Attempt Typesense
    const typesenseHost = process.env.TYPESENSE_HOST || ''
    const typesenseKey = process.env.TYPESENSE_API_KEY || ''
    if (typesenseHost && typesenseKey) {
      try {
        const u = new URL(`${typesenseHost.replace(/\/$/, '')}/collections/products/documents/search`)
        u.searchParams.set('q', q)
        u.searchParams.set('query_by', 'name,description')
        u.searchParams.set('per_page', String(take))
        const resp = await fetch(u.toString(), { headers: { 'X-TYPESENSE-API-KEY': typesenseKey } })
        if (resp.ok) {
          const j = await resp.json()
          const hits = Array.isArray(j?.hits) ? j.hits.map((h: any) => h.document) : []
          return NextResponse.json({ source: 'typesense', items: hits })
        }
      } catch {}
    }

    // Fallback: Prisma LIKE search with expanded tokens
    const whereAny = expanded.length > 0
      ? {
          OR: expanded.flatMap((t) => ([
            { name: { contains: t, mode: 'insensitive' as const } },
            { description: { contains: t, mode: 'insensitive' as const } },
          ])),
        }
      : {}

    const items = await prisma.product.findMany({
      where: whereAny as any,
      orderBy: { createdAt: 'desc' },
      take,
    })
    return NextResponse.json({ source: 'prisma', items })
  } catch (e) {
    return NextResponse.json({ source: 'error', items: [] }, { status: 500 })
  }
}
