// Offline support for the web version: the app shell is cached on install, and
// everything else the first time it's used, so a universe keeps working without
// a connection. Pages and code are refreshed in the background on each visit.
const CACHE = 'littleverse-v3';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'css/fonts.css', 'css/base.css', 'css/app.css',
  'js/main.js', 'js/core/dom.js', 'js/lib/db.js', 'js/lib/catalog.js', 'js/lib/dates.js', 'js/lib/lucide.js',
  'js/shell/kit.js', 'js/shell/native.js', 'js/shell/home.js', 'js/shell/poster.js', 'js/core/cat.js', 'js/core/store.js',
  'assets/icon.svg', 'assets/fonts/figtree-latin-wght-normal.woff2', 'assets/fonts/cormorant-garamond-latin-600-normal.woff2'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {})); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // audio is streamed with range requests; let the browser handle it directly
  if (req.headers.has('range')) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => { if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
