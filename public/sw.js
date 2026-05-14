/* Service Worker Manupackaging - Versão Estável */
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Apenas repassa a requisição sem interferir
    // Isso evita o erro auth/network-request-failed
    event.respondWith(fetch(event.request));
});
