// Edebiyat Oyunhânesi - Çevrimdışı Hizmet Çalışanı (Offline-First Service Worker)
const CACHE_NAME = 'edebiyathane-v14';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './dunya-edebiyati.html',
  './cocuk-edebiyati.html',
  './manifest.json',
  './assets/bg_edebiyathane.jpg',
  './assets/logo_alef.png',
  './assets/logo_sertan.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable.png',
  './assets/alef.png',
  './Pitrak-Nusha/index.html',
  './Pitrak-Nusha/manifest.json',
  './Pitrak-Nusha/assets/style.css',
  './Pitrak-Nusha/assets/app.js',
  './Pitrak-Nusha/assets/db.js',
  './Pitrak-Nusha/assets/render.js',
  './Pitrak-Nusha/assets/export.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache partial miss:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Stale-while-revalidate for faster subsequent loads & offline capability
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, clone);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
