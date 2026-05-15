/* 
  Service Worker Manupackaging V8 
  Estratégia: Network First (Pass-through) para evitar erros de autenticação Firebase.
  A presença de um SW com fetch handler é requisito obrigatório para PWA instalável.
*/

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Apenas repassa a requisição para o navegador.
    // Necessário apenas para cumprir o requisito de PWA.
    event.respondWith(fetch(event.request));
});
