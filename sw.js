// ── Firebase Cloud Messaging ──
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC_FCW4xncM1O4Yq9f5sHjNF5f7UFnHUXA",
  authDomain: "pflichten-app-f1ebe.firebaseapp.com",
  databaseURL: "https://pflichten-app-f1ebe-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "pflichten-app-f1ebe",
  storageBucket: "pflichten-app-f1ebe.firebasestorage.app",
  messagingSenderId: "83874401171",
  appId: "1:83874401171:web:485509d6dc9d790978b666"
});

const messaging = firebase.messaging();

// FCM auto-displays notification from the notification field,
// so we don't call showNotification() here to avoid duplicates
messaging.onBackgroundMessage((payload) => {
  console.log('Push: background message received');
});

// ── Notification Click → open app ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes('index.html') || client.url.endsWith('/')) {
          return client.focus();
        }
      }
      return clients.openWindow('./');
    })
  );
});

// ── Cache (PWA offline) ──
const CACHE_NAME = 'devotion-app-v11';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => Promise.allSettled(ASSETS.map(a => c.add(a)))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // WICHTIG: Nicht-GET (POST an Stripe-Checkout/Portal) und alle /api/-Aufrufe
  // NIEMALS abfangen – sonst schlaegt der Body in der App-WebView fehl ("Connection error").
  if (req.method !== 'GET' || req.url.includes('/api/')) {
    return; // Browser direkt machen lassen
  }
  if (req.url.includes('firebasedatabase') || req.url.includes('gstatic.com') || req.url.includes('fcmregistrations')) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  // BUGFIX 5.6.2026: HTML/Navigation NETWORK-FIRST — sonst haengt nach jedem Update
  // die alte App-Shell im Cache fest (Aufgaben-Bug schien nach Upload nicht behoben).
  const isDoc = req.mode === 'navigate' || req.destination === 'document' ||
                req.url.endsWith('/') || req.url.endsWith('.html');
  if (isDoc) {
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return resp;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
  } else {
    // Statische Assets weiter cache-first (schnell)
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
  }
});
