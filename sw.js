/* Service worker: simpan semua fail aplikasi supaya boleh dibuka tanpa internet. */
const VERSI = 'photobooth-v2';
const FAIL = [
  './', './index.html', './styles.css', './app.js', './config.js', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png',
  ...[1, 2, 3, 4, 5, 6].flatMap(n => [`./bingkai${n}.webp`, `./bingkai${n}_kecil.webp`])
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then(c => c.addAll(FAIL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(n => n !== VERSI).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // jangan sentuh Google Apps Script
  // Cache dahulu, kemudian kemas kini di belakang tabir (stale-while-revalidate)
  e.respondWith(caches.open(VERSI).then(async (cache) => {
    const ada = await cache.match(req, { ignoreSearch: true });
    const baru = fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (ada) { e.waitUntil(baru); return ada; }
    const res = await baru;
    if (res) return res;
    if (req.mode === 'navigate') return cache.match('./index.html');
    return new Response('', { status: 504 });
  }));
});
