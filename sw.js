var cacheName = 'ClashZ-v0.0.1'
var cacheFiles = [
    'index.html',
    '/js/app.js',
    '/css/bulma.min.css',
    '/css/main.css',
    '/images/icons/logo-32.png',
    '/images/icons/logo-128.png',
    '/images/icons/logo-144.png',
    '/images/icons/logo-152.png',
    '/images/icons/logo-192.png',
    '/images/icons/logo-256.png',
    '/images/icons/logo-512.png'
]

self.addEventListener('install', e => {
    console.log('[ClashZ - ServiceWorker] Install');
    e.waitUntil(
        caches.open(cacheName).then(cache => {
            console.log('[ClashZ - ServiceWorker] Caching')
            return cache.addAll(cacheFiles)
        })
    )
})

self.addEventListener('activate', e => {
    console.log('[ClashZ - ServiceWorker] Activate');
    e.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== cacheName) {
                    console.log('[ClashZ - ServiceWorker] Removing old cache', key)
                    return caches.delete(key)
                }
            }))
        })
    )
    return self.clients.claim()
})

self.addEventListener('fetch', e => {
    
});