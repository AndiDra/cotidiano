// Cotidiano: permite instalar la app y abrirla sin conexión.
// Al cambiar archivos no hace falta tocar esto: la página siempre se busca primero en la red.
const CACHE = 'cotidiano-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const store = (req, res) => {
  if (res && (res.ok || res.type === 'opaque')) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
  }
  return res;
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'api.github.com') return; // los datos siempre van directo a GitHub

  if (url.origin === self.location.origin) {
    // Red primero (así llegan las actualizaciones); si no hay conexión, la copia guardada
    e.respondWith(
      fetch(req).then(res => store(req, res))
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    // Tipografías: copia guardada primero
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => store(req, res))));
  }
});
