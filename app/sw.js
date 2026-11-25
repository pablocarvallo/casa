// Casa · guarda la app para abrirla sin conexión. Siempre intenta primero la versión más nueva (red primero), así
// index.html y calculos.js llegan juntos; sin señal usa la copia guardada. Los datos van a domesticas-api (otro
// origen) y no pasan por aquí.
const CACHE = 'casa27-v5';
const ARCHIVOS = ['./', 'index.html', 'calculos.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('casa27-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
  // «no-cache»: pregunta siempre al servidor si hay versión nueva (GitHub Pages deja copias por 10 minutos)
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res && res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? 'index.html' : req, copia)); }
      return res;
    }).catch(() => caches.match(req.mode === 'navigate' ? 'index.html' : req, { ignoreSearch: true }))
  );
});
