/**
 * Simple PWA Service Worker for Mavex
 * - Caches app shell and static assets
 * - Runtime cache for images under /img and /_next/static
 * - Network-first for HTML/navigation requests
 */
const VERSION = 'v1.0.0';
const APP_SHELL = [
  '/',
  '/site.webmanifest',
  '/fallback.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(`mavex-shell-${VERSION}`).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.includes(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function isHtmlRequest(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}
function isRuntimeStatic(requestUrl) {
  return requestUrl.pathname.startsWith('/_next/static') || requestUrl.pathname.startsWith('/img/') || requestUrl.pathname.startsWith('/uploads/');
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for navigations (HTML)
  if (isHtmlRequest(event.request)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(event.request);
          return fresh;
        } catch (err) {
          const cache = await caches.open(`mavex-shell-${VERSION}`);
          const cached = await cache.match('/');
          return cached || new Response('You are offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        }
      })()
    );
    return;
  }

  // Cache-first for runtime static files (images, next static chunks)
  if (isRuntimeStatic(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(`mavex-runtime-${VERSION}`);
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const resp = await fetch(event.request);
          if (resp && resp.ok && (resp.status === 200)) {
            cache.put(event.request, resp.clone());
          }
          return resp;
        } catch (err) {
          return cached || Response.error();
        }
      })()
    );
  }
});
