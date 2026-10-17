// Versionen (#6): version.json = alle ?v= in index.html = Schrift-URL in style.css = CACHE_VERSION in sw.js.
import { readFileSync } from "fs";
import assert from "assert/strict";
const r = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
let pass = 0;
const t = (name, fn) => { fn(); pass += 1; console.log("ok -", name); };
const V = JSON.parse(r("version.json")).version;
const html = r("index.html"), css = r("css/style.css"), sw = r("sw.js");

t("version.json hat eine Version", () => assert.match(V, /^[0-9A-Za-z.\-]+$/));

t("jede lokale href/src in index.html trägt ?v=<Version>", () => {
  const refs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1])
    .filter((u) => !/^(https?:|data:|#)/.test(u) && u !== "manifest.webmanifest");
  assert.ok(refs.length >= 6, `zu wenige Referenzen: ${refs.join(", ")}`);
  for (const u of refs) assert.ok(u.endsWith(`?v=${V}`), `${u} hat nicht ?v=${V}`);
  for (const f of ["css/style.css", "js/logic.js", "js/game.js", "js/pwa.js"]) assert.ok(refs.includes(`${f}?v=${V}`), `${f} fehlt`);
});

t("Schrift in style.css trägt ?v=<Version>", () => {
  const urls = [...css.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]).filter((u) => u.includes("fonts/"));
  assert.ok(urls.length >= 1);
  for (const u of urls) assert.ok(u.endsWith(`?v=${V}`), u);
});

t("CACHE_VERSION in sw.js = version.json, Cache-Name daraus abgeleitet", () => {
  const m = sw.match(/const CACHE_VERSION = "([^"]+)";/);
  assert.ok(m, "CACHE_VERSION fehlt");
  assert.equal(m[1], V);
  assert.match(sw, /const CACHE = `snake-\$\{CACHE_VERSION\}`;/);
});

t("sw.js: skipWaiting, clients.claim, alte Caches löschen", () => {
  assert.match(sw, /skipWaiting\(\)/);
  assert.match(sw, /clients\.claim\(\)/);
  assert.match(sw, /keys\.filter\(\(k\) => k !== CACHE\)\.map\(\(k\) => caches\.delete\(k\)\)/);
});

t("vorgeladene Assets des SW sind genau die versionierten Dateien aus index.html", () => {
  const block = sw.slice(sw.indexOf("const ASSETS"), sw.indexOf("].map((a) => a + V)"));
  const swFiles = [...block.matchAll(/"\/([^"]+)"/g)].map((m) => m[1]);
  const htmlFiles = [...html.matchAll(/\s(?:href|src)="([^"?]+)\?v=/g)].map((m) => m[1]);
  for (const f of htmlFiles) assert.ok(swFiles.includes(f), `${f} fehlt im SW`);
  assert.ok(swFiles.includes("fonts/VT323-Regular.ttf"));
});
console.log(`${pass} Tests ok`);
