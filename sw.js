/**
 * Flix Vision — Service Worker
 * Caches the app shell so it loads instantly on repeat visits.
 * Does NOT cache video streams — those are always fetched live.
 */

const CACHE    = 'flix-v1';
const PRECACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/auth.css',
    '/js/api.js',
    '/js/auth.js',
    '/js/player.js',
    '/js/app.js',
];

// Install — cache the app shell
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
    );
});

// Activate — delete old caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch — serve from cache, fall back to network
// Never cache API calls, embed iframes, or TMDB requests
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Always pass through: API, external CDNs, embed sources, TMDB
    if (
        url.hostname !== self.location.hostname ||
        url.pathname.startsWith('/api') ||
        e.request.method !== 'GET'
    ) {
        return; // let browser handle it normally
    }

    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(response => {
                // Only cache successful same-origin responses
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return response;
            });
        })
    );
});
