// Vie del Lago Apicoltura — Service Worker v18
// Cache-first per asset statici; network-first per HTML

const CACHE = 'vdl-v18';
const STATIC = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/storia.html',
  '/territorio.html',
  '/api.html',
  '/educazione.html',
  '/prodotti.html',
  '/millefiori.html',
  '/acacia.html',
  '/sulla.html',
  '/chi-siamo.html',
  '/etichette.html',
  '/contatti.html',
  '/faq.html',
  '/privacy.html',
  '/img/logo-esteso-nero.png',
  '/img/logo-esteso-bianco.png',
  '/img/hero-fallback.webp',
  '/img/storia-fallback.webp',
  '/img/fiore-botanico.webp',
  '/img/etichetta-millefiori-flat.webp',
  '/img/etichetta-acacia-flat.webp',
  '/img/etichetta-sulla-flat.webp',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Solo richieste same-origin
  if (url.origin !== location.origin) return;

  // HTML: network-first (sempre freschi)
  if (request.destination === 'document') {
    e.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Asset statici: cache-first
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      });
    })
  );
});
