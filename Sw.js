// Change this number every time you update your code,
// so phones download the new version instead of the old one.
const VERSION = 'v5.1.9';
const CACHE = 'todo-' + VERSION;

const FILES = [
    './',
    './index.html',
    './style1.css',
    './DOM4.js',
    './timer.js',
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

// Serve from the phone first, fall back to the network
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (new URL(event.request.url).origin !== location.origin) return; // skip Google Fonts etc.

    event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
});
