const BUILD_ID = '__BUILD_ID__'
const CACHE_NAME = `ai-trainer-shell-${BUILD_ID}`
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
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
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

  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('googleapis.com') ||
    url.pathname.includes('generativelanguage.googleapis.com')
  ) {
    return
  }

  if (request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')) {
    event.respondWith(
      Promise.race([
        fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
          }
          return response
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Navigation request timed out')), 3000)
        }),
      ]).catch(async () => {
        const cached = await caches.match(request)
        return cached ?? caches.match('/')
      }),
    )
    return
  }

  const isNextStaticAsset = url.pathname.startsWith('/_next/static/')
  if (!CACHEABLE_ASSETS.has(url.pathname) && !isNextStaticAsset) {
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        if (isNextStaticAsset) {
          void fetch(request)
            .then((response) => {
              if (response.ok) {
                return caches.open(CACHE_NAME).then((cache) => cache.put(request, response))
              }
              return undefined
            })
            .catch(() => undefined)
        }
        return cached
      }

      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
          }
          return response
        })
        .catch(() => caches.match('/'))
    }),
  )
})
