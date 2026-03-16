const CACHE_NAME = 'linuxquest-v6'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/css/styles.css',
  '/assets/js/main.js',
  '/assets/img/Logo.png',
  '/assets/img/bg-image.png',
  '/manifest.webmanifest'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(event.request)
        const cache = await caches.open(CACHE_NAME)
        cache.put(event.request, networkResponse.clone())
        return networkResponse
      } catch (_) {
        const cachedResponse = await caches.match(event.request)
        if (cachedResponse) return cachedResponse
        throw _
      }
    })()
  )
})
