import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin
  const now = new Date().toISOString()

  // DB checks
  const db: any = { ok: false }
  try {
    const started = Date.now()
    // Minimal check: connectivity + a couple of lightweight queries
    await prisma.$queryRaw`SELECT 1` // connectivity
    const productsCount = await prisma.product.count().catch(() => -1)
    const couponsCount = await (prisma as any).coupon
      ?.count?.()
      .catch(() => -1)
    let siteSettingsExists = false
    try {
      const s = await (prisma as any).siteSettings.findUnique({ where: { id: 'default' } })
      siteSettingsExists = !!s
    } catch {
      siteSettingsExists = false
    }
    const elapsed = Date.now() - started
    db.ok = true
    db.timingMs = elapsed
    db.productsCount = productsCount
    db.couponsCount = couponsCount ?? -1
    db.siteSettingsExists = siteSettingsExists
  } catch (e: any) {
    db.ok = false
    db.error = e?.message || 'DB check failed'
  }

  // Endpoint checks
  const endpoints: any = {}
  try {
    const r = await fetch(`${origin}/site.webmanifest`, { cache: 'no-store' })
    endpoints.manifest = { ok: r.ok, status: r.status }
  } catch (e: any) {
    endpoints.manifest = { ok: false, status: 0, error: e?.message }
  }
  try {
    const r = await fetch(`${origin}/favicon.ico`, { cache: 'no-store' })
    endpoints.favicon = { ok: r.ok, status: r.status }
  } catch (e: any) {
    endpoints.favicon = { ok: false, status: 0, error: e?.message }
  }

  return NextResponse.json({
    ok: db.ok && !!endpoints.manifest?.ok,
    timestamp: now,
    uptimeMs: Math.round(process.uptime() * 1000),
    db,
    endpoints,
  })
}
