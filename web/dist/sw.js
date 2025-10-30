self.addEventListener('install', (event) => {
    event.waitUntil(caches.open('hh-static-v1').then((cache) => cache.addAll([
        '/',
        '/index.html',
        '/manifest.webmanifest'
    ])))
})

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url)
    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
                const copy = res.clone()
                caches.open('hh-static-v1').then((cache) => cache.put(event.request, copy)).catch(() => { })
                return res
            }).catch(() => cached))
        )
    }
})
