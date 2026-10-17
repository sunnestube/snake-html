// PWA (#6): Service Worker registrieren (offline). Ohne Unterstützung läuft das Spiel unverändert.
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => { /* kein SW: nur online */ });
  });
}
