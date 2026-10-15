const CACHE_NAME = 'ai-trainer-shell-v2'
const APP_SHELL = [
  '/',
  '/icon.svg',
  '/apple-icon.png',
  '/icons/ai-trainer-192.png',
  '/icons/ai-trainer-512.png',
]
const CACHEABLE_ASSETS = new Set([
  '/icon.svg',
  '/apple-icon.png',
  '/icons/ai-trainer-192.png',
  '/icons/ai-trainer-512.png',
])

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('ai-trainer-shell-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return
  }

  if (url.pathname.startsWith('/api/') || url.pathname.includes('googleapis.com')) {
    return
  }

  if (url.pathname.startsWith('/_next/')) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
          }
          return response
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match('/'))),
    )
    return
  }

  if (!CACHEABLE_ASSETS.has(url.pathname)) {
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached
      }

      return fetch(request)
        .then((response) => {
          const responseClone = response.clone()
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
          return response
        })
        .catch(() => caches.match('/') || caches.match('/icon.svg'))
    }),
  )
})
