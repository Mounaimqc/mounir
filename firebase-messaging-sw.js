// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCUcmmnvxjsZoDgQyESi5AvsynnH1kljFc",
  authDomain: "mounir-40df8.firebaseapp.com",
  projectId: "mounir-40df8",
  storageBucket: "mounir-40df8.firebasestorage.app",
  messagingSenderId: "855089551978",
  appId: "1:855089551978:web:dfd904eb3788d3504e4813",
  measurementId: "G-M680BM9Y77"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('🔔 [SW] Push reçu en arrière-plan:', payload);

  const title = payload.notification?.title || payload.data?.title || '🔔 Nouvelle Commande!';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'Une nouvelle commande a été enregistrée.',
    icon: payload.notification?.icon || payload.data?.icon || 'logo.jpeg',
    badge: 'logo.jpeg',
    vibrate: [200, 100, 200],
    data: {
      url: payload.data?.url || 'admin.html',
      orderNumber: payload.data?.orderNumber || ''
    },
    tag: payload.data?.orderNumber ? `order-${payload.data.orderNumber}` : 'new-order',
    renotify: true
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ [SW] Clic sur la notification:', event.notification);
  event.notification.close();

  const relativeUrl = event.notification.data?.url || 'admin.html';
  const targetUrl = new URL(relativeUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes('admin.html') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
