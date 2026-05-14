/* Service Worker Manupackaging - Final V6 */
const CACHE_NAME = 'manu-cache-v6';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            clients.claim(),
            caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
        ])
    );
});

self.addEventListener('fetch', (event) => {
    // Apenas repassa para evitar erros no Firebase Auth
    // Mas a presença desse handler é obrigatória para PWA
    if (event.request.url.includes('googleapis.com') || event.request.url.includes('firebase')) {
        return;
    }
    
    event.respondWith(fetch(event.request));
});
