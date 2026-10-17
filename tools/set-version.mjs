// Eine Versionsquelle (#6): version.json. Schreibt die Version in index.html (?v=), css/style.css (Schrift ?v=) und sw.js (CACHE_VERSION).
// Aufruf: node tools/set-version.mjs [neue-version]   (ohne Argument: Version aus version.json übernehmen)
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const p = (f) => join(root, f);
const arg = process.argv[2];
if (arg) writeFileSync(p("version.json"), JSON.stringify({ version: arg }, null, 2) + "\n");
const V = JSON.parse(readFileSync(p("version.json"), "utf8")).version;
if (!/^[0-9A-Za-z.\-]+$/.test(V)) throw new Error(`ungültige Version: ${V}`);

// Lokale href/src in index.html: Query ?v= setzen bzw. ersetzen (externe Links und manifest bleiben).
let html = readFileSync(p("index.html"), "utf8");
html = html.replace(/(\s(?:href|src)=")(?!https?:|data:|#|manifest\.webmanifest)([^"?]+)(?:\?v=[^"]*)?"/g, `$1$2?v=${V}"`);
writeFileSync(p("index.html"), html);

let css = readFileSync(p("css/style.css"), "utf8");
css = css.replace(/url\("(\.\.\/fonts\/[^"?]+)(?:\?v=[^"]*)?"\)/g, `url("$1?v=${V}")`);
writeFileSync(p("css/style.css"), css);

let sw = readFileSync(p("sw.js"), "utf8");
sw = sw.replace(/const CACHE_VERSION = "[^"]*";/, `const CACHE_VERSION = "${V}";`);
writeFileSync(p("sw.js"), sw);
console.log(`Version ${V} gesetzt`);
