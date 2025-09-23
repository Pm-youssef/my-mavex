// Simple in-memory rate limiter for Next.js Route Handlers
// Note: In serverless environments, memory may not be shared across instances.
// For production, consider Redis or a durable store. This is a pragmatic baseline.

const buckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  try {
    const xf = req.headers.get('x-forwarded-for') || '';
    if (xf) return xf.split(',')[0].trim();
    const cf = req.headers.get('cf-connecting-ip');
    if (cf) return cf;
    const xreal = req.headers.get('x-real-ip');
    if (xreal) return xreal;
  } catch {}
  return 'unknown';
}

export function rateLimit(
  req: Request,
  bucketId: string,
  opts: { limit?: number; windowMs?: number } = {}
): { ok: boolean; remaining: number; resetMs: number } {
  const limit = Math.max(1, Math.floor(opts.limit ?? 5));
  const windowMs = Math.max(1000, Math.floor(opts.windowMs ?? 60_000));
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${bucketId}:${ip}`;
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetMs: windowMs };
  }

  if (entry.count < limit) {
    entry.count += 1;
    buckets.set(key, entry);
    return { ok: true, remaining: limit - entry.count, resetMs: entry.resetAt - now };
  }

  return { ok: false, remaining: 0, resetMs: entry.resetAt - now };
}
