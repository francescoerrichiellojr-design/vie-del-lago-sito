// Copia sul telefono della pagina di rimando /a/, così QR e NFC delle arnie funzionano anche senza rete.
const CACHE = "rimando-arnie-v1";
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "./index.html"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(
    fetch(e.request)
      .then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", copia)); return r; })
      .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
  );
});
