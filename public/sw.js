/* Service Worker - Manupackaging Clean v5 */
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Pass-through strategy to avoid breaking Firebase Auth network requests
    event.respondWith(fetch(event.request));
});
