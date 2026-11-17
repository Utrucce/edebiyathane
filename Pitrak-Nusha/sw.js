/* Pıtrak Nüsha — çevrimdışı çalışma */
const CACHE = 'pitrak-nusha-v1';
const CORE = ['./', 'index.html', 'manifest.json', 'assets/style.css', 'assets/db.js', 'assets/render.js', 'assets/export.js', 'assets/app.js',
  'assets/pitrak.jpg', 'assets/alef.png', 'assets/icon-192.png', 'assets/fonts/fonts.css',
  'assets/vendor/html2canvas.min.js', 'assets/vendor/jspdf.umd.min.js', 'assets/vendor/docx.umd.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url); if (u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.match(e.request).then(m => m || caches.match('index.html')))
  );
});
