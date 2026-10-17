// PWA (#6): Service Worker registrieren (offline). Ohne Unterstützung läuft das Spiel unverändert.
// updateViaCache "none": sw.js kommt nie aus dem HTTP-Cache, ein Deploy wird beim nächsten Start erkannt.
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => reg.update())
      .catch(() => { /* kein SW: nur online */ });
  });
}
