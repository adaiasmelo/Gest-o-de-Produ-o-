importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// O Firebase Applet Config será lido do ambiente se possível, mas aqui precisamos passar hardcoded ou de alguma forma dinâmica.
// Como somos um builder, podemos ler do arquivo gerado.
// NOTA: No ambiente real, o build process pode injetar isso ou o PWA plugin pode lidar.
// Para simplicidade e seguindo as instruções de PWA, vou assumir o uso do messaging padrão.

firebase.initializeApp({
  apiKey: "AIzaSyCTtHT3OE8e8i54nNCLP5RPS8rxCPsLk2I",
  authDomain: "gen-lang-client-0007395511.firebaseapp.com",
  projectId: "gen-lang-client-0007395511",
  storageBucket: "gen-lang-client-0007395511.firebasestorage.app",
  messagingSenderId: "871504330675",
  appId: "1:871504330675:web:8a10f2c147935e3f9555c6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em segundo plano: ', payload);
  
  const notificationTitle = payload.notification.title || 'Manupackaging';
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || 'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png',
    badge: 'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png',
    tag: 'production-alert', // Agrupa mensagens repetidas
    renotify: true, // Notifica novamente mesmo se a tag for a mesma
    vibrate: [200, 100, 200], // Padrão de vibração
    data: {
      url: self.location.origin
    }
  };

  // Tenta atualizar o contador (Badge) no ícone do app
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge().catch(console.error);
  }

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Ao clicar na notificação, abre o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(console.error);
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
