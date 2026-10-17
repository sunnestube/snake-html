// Service Worker (#6): alle Assets beim Installieren in den Cache, danach offline lauffähig.
// Neue Version = CACHE hochzählen; alte Caches werden beim Aktivieren gelöscht.
const CACHE = "snake-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/logic.js",
  "/js/game.js",
  "/js/pwa.js",
  "/fonts/VT323-Regular.ttf",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Navigation: Netz zuerst (frische Version), offline die gecachte Startseite.
// Assets: Cache zuerst, im Hintergrund aktualisieren (stale-while-revalidate).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("/index.html", copy)); return res; })
        .catch(() => caches.match("/index.html", { ignoreSearch: true }))
    );
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req)
        .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
        .catch(() => hit);
      return hit || net;
    })
  );
});
