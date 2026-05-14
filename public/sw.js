self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Apenas repassa a requisição, necessário para o PWA ser instalável
  event.respondWith(fetch(event.request));
});
