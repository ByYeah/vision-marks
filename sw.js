const CACHE_NAME = 'vision-marks-v8';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/main.css',
    '/js/app.js',
    '/js/modules/storage.js',
    '/js/modules/state.js',
    '/js/modules/settings.js',
    '/js/modules/modals.js',
    '/js/modules/bookmarks.js',
    '/js/modules/folders.js',
    '/js/modules/render.js',
    '/js/modules/reorder.js',
    '/js/modules/database.js',
    '/js/modules/search.js',
    '/js/modules/importExport.js',
    '/js/modules/iconManager.js',
    '/js/utils/svg-loader.js',
    '/js/modules/events.js',
    '/js/modules/chat.js'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker instalado');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache abierto');
                return cache.addAll(urlsToCache);
            })
            .catch(err => console.error('Error al cachear:', err))
    );
    self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker activado');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Limpiando cache antigua:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch: Estrategia "Cache First, then Network"
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(
                    networkResponse => {
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return networkResponse;
                    }
                ).catch(() => {
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                    return new Response('Offline', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
    );
});

// Escuchar mensajes desde la app para forzar actualización
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});