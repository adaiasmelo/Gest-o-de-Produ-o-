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
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
