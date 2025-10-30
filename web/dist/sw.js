const CACHE_VERSION = 'hh-static-v6'

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll([
        '/',
        '/index.html',
        '/manifest.webmanifest'
    ])))
    self.skipWaiting() // Force the waiting service worker to become the active service worker
})

self.addEventListener('activate', (event) => {
    // Delete old caches
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_VERSION) {
                        return caches.delete(cacheName)
                    }
                })
            )
        })
    )
    self.clients.claim() // Take control of all pages immediately
})

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url)
    if (url.origin === location.origin) {
        // Let API requests hit the network so admin data and bookings stay fresh
        if (url.pathname.startsWith('/api/')) {
            event.respondWith(
                fetch(event.request).catch(async () => caches.match(event.request))
            )
            return
        }

        event.respondWith(
            caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
                const copy = res.clone()
                caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy)).catch(() => { })
                return res
            }).catch(() => cached))
        )
    }
})
