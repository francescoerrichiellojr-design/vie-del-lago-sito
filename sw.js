// Vie del Lago Apicoltura — Service Worker v25
// Network-first per HTML; stale-while-revalidate per tutto il resto (CSS, JS, immagini, font):
// la pagina usa subito la copia in cache e intanto scarica la versione nuova, così dopo un
// aggiornamento del sito i visitatori vedono le modifiche al caricamento successivo anche se
// la versione della cache qui sotto non viene cambiata.

const CACHE = 'vdl-v25';
const STATIC = [
  '/',
  '/index.html',
  '/racconto.css',
  '/racconto.js',
  '/script.js',
  '/vendor/lenis-1.3.27.css',
  '/vendor/lenis-1.3.27.min.js',
  '/fonts/manrope-latin-400-normal.woff2',
  '/fonts/manrope-latin-500-normal.woff2',
  '/fonts/manrope-latin-600-normal.woff2',
  '/fonts/gloock-latin-400-normal.woff2',
  '/fonts/eb-garamond-latin-500-normal.woff2',
  '/img/logo-firma-terra.webp',
  '/img/logo-firma-crema.webp',
  '/img/marchio-crema.png',
  '/img/marchio-terra.png',
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

  // Video e richieste a pezzi (Range): direttamente dalla rete. Safari riproduce un video solo
  // se riceve i pezzi che ha chiesto, e una copia intera presa dalla cache lo bloccherebbe.
  if (request.destination === 'video' || request.headers.has('range')) return;
  // Modelli 3D: pesano diversi MB, li tiene la cache del browser e non questa
  if (/\.(glb|usdz)$/.test(url.pathname)) return;

  // HTML: network-first (sempre freschi)
  if (request.destination === 'document') {
    e.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Tutto il resto (CSS, JS, immagini, font): stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(request).then(cached => {
        const fetchPromise = fetch(request).then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            cache.put(request, res.clone());
          }
          return res;
        }).catch(() => cached);
        if (cached) {
          e.waitUntil(fetchPromise.catch(() => {}));
          return cached;
        }
        return fetchPromise;
      })
    )
  );
});
