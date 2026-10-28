// Service Worker (#6). Version kommt aus version.json (node tools/set-version.mjs), nie von Hand ändern.
// Jede Version hat einen eigenen Cache; activate löscht alle anderen. Assets tragen ?v=<Version>.
const CACHE_VERSION = "1.1.2";
const CACHE = `snake-${CACHE_VERSION}`;
const V = `?v=${CACHE_VERSION}`;
const PAGES = ["/", "/index.html", "/manifest.webmanifest"];
const ASSETS = [
  "/css/style.css", "/js/logic.js", "/js/game.js", "/js/pwa.js", "/fonts/VT323-Regular.ttf",
  "/icons/favicon-32.png", "/icons/apple-touch-icon.png",
].map((a) => a + V).concat([
  "/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-192.png", "/icons/maskable-512.png",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll([...PAGES.map((u) => new Request(u, { cache: "reload" })), ...ASSETS.map((u) => new Request(u, { cache: "reload" }))]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isPage = (req, url) => req.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith(".html") || url.pathname === "/manifest.webmanifest";

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js" || url.pathname.startsWith("/.well-known/")) return;   // immer direkt vom Netz

  // HTML und Manifest: Netz zuerst, offline aus dem Cache.
  if (isPage(req, url)) {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req.mode === "navigate" ? "/index.html" : req, copy)); }
          return res;
        })
        .catch(() => caches.open(CACHE).then((c) => c.match(req.mode === "navigate" ? "/index.html" : req, { ignoreSearch: true }))
          .then((hit) => hit || caches.match("/index.html", { ignoreSearch: true })))
    );
    return;
  }

  // Assets: Cache zuerst (exakte URL inkl. ?v=), sonst Netz und in den aktuellen Cache legen.
  event.respondWith(
    caches.open(CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) c.put(req, res.clone());
      return res;
    })))
  );
});
