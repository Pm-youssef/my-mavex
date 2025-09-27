export const dynamic = 'force-dynamic'

import Link from 'next/link'

async function getHealth() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/health`, {
      cache: 'no-store',
      // Fallback to relative fetch on server if env is not set
      next: { revalidate: 0 },
    })
    if (!res.ok) throw new Error(`Status ${res.status}`)
    return await res.json()
  } catch {
    // Try relative path (works SSR on same host)
    try {
      const res = await fetch(`/api/health`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      return await res.json()
    } catch (e) {
      return { ok: false, error: (e as any)?.message || 'failed' }
    }
  }
}

export default async function AdminHealthPage() {
  const data = await getHealth()
  const ok = !!data?.ok
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">System Health</h1>

      <div className={`rounded border p-4 ${ok ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
        <div className="flex items-center justify-between">
          <span>Status</span>
          <span className={`font-bold ${ok ? 'text-green-700' : 'text-red-700'}`}>{ok ? 'OK' : 'Issue detected'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded border p-4">
          <h2 className="font-semibold mb-2">Database</h2>
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(data?.db ?? {}, null, 2)}</pre>
        </div>
        <div className="rounded border p-4">
          <h2 className="font-semibold mb-2">Endpoints</h2>
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(data?.endpoints ?? {}, null, 2)}</pre>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/admin" className="text-blue-600 underline">Back to Admin</Link>
        <a href="/api/health" className="text-blue-600 underline" target="_blank">Open /api/health</a>
      </div>
    </div>
  )
}
