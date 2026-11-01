// Change this value every time you update your code,
// so phones download the new version instead of the old one.
const VERSION = 'v23';
const CACHE = 'todo-' + VERSION;

const FILES = [
    './',
    './index.html',
    './style1.css',
    './bundle.css',
    './celebrate.css',
    './feedback.css',
    './DOM4.js',
    './timer.js',
    './bundle.js',
    './celebrate.js',
    './feedback.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Save the app files on the phone
self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
    self.skipWaiting();
});

// Delete old versions of the cache
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Network first: when you're online you always get the newest files.
// The saved copy is only used when you're offline.
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (new URL(event.request.url).origin !== location.origin) return; // skip Google Fonts etc.

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
                }
                return response;
            })
            .catch(() =>
                caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
            )
    );
});
