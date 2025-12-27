const CACHE_NAME = 'cic-agency-v2'; // Updated version to force cache clear
const urlsToCache = [
    './',
    './index.html',
    './home.html',
    './task.html',
    './level.html',
    './payment.html',
    './withdrawal.html',
    './assets/css/auth-styles.css',
    './js/api-config.js',
    './manifest.json',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png'
];

// Clear old caches on install (Chrome-specific fix)
self.addEventListener('install', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return caches.open(CACHE_NAME).then(cache => {
                return cache.addAll(urlsToCache);
            });
        })
    );
    // Force activation immediately
    self.skipWaiting();
});

// Activate new service worker immediately (Chrome-specific fix)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache on activate:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all pages immediately
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', event => {
    // Skip non-GET requests (Service Worker cannot cache POST/PUT/DELETE)
    if (event.request.method !== 'GET') {
        return;
    }

    // For HTML files, always fetch fresh (no cache) to avoid Chrome cache issues
    if (event.request.destination === 'document' ||
        event.request.url.endsWith('.html') ||
        event.request.url.includes('home.html') ||
        event.request.url.includes('index.html')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }

    // For other resources, use cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
