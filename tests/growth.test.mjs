// Deterministischer Test der Wachs-Logik: node tests/growth.test.mjs
import { createRequire } from "module";
import assert from "assert/strict";
const L = createRequire(import.meta.url)("../js/logic.js");

const C = 20, R = 20;
let seed = 42;
const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const snake = (start, dir, name = "s") => ({ name, body: L.makeBody(start, dir, C, R), dir, alive: true, points: 0 });
const state = (snakes, food) => ({ snakes, food, cols: C, rows: R, rng });
let pass = 0;
const t = (name, fn) => { fn(); pass += 1; console.log("ok -", name); };

t("Solo-Fressen: +1 im selben Tick, body.length === 3 + points", () => {
  const s = snake({ x: 4, y: 10 }, { x: 1, y: 0 });
  const st = state([s], { x: 5, y: 10 });
  for (let n = 1; n <= 5; n += 1) {
    st.food = { x: s.body[0].x + 1, y: 10 };
    L.step(st);
    assert.equal(s.points, n);
    assert.equal(s.body.length, 3 + n);
    assert.ok(s.alive);
  }
  st.food = { x: 0, y: 0 };
  L.step(st);
  assert.equal(s.body.length, 3 + s.points);
});

t("Wrap-Fressen ueber die Kante: +1", () => {
  const s = snake({ x: 19, y: 3 }, { x: 1, y: 0 });
  const st = state([s], { x: 0, y: 3 });
  L.step(st);
  assert.deepEqual(s.body[0], { x: 0, y: 3 });
  assert.equal(s.points, 1);
  assert.equal(s.body.length, 4);
});

t("Schwanz-Feld nach Fressen: eigenes Schwanzende ist frei", () => {
  // 2x2-Kreis: nach dem Fressen (Laenge 4) zieht der Kopf auf das alte Schwanzende.
  const s = { name: "s", body: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 6 }], dir: { x: 0, y: 1 }, alive: true, points: 0 };
  const st = state([s], { x: 5, y: 6 });
  L.step(st); // frisst auf (5,6), Laenge 4: (5,6)(5,5)(4,5)(4,6)
  assert.equal(s.body.length, 4);
  st.food = { x: 10, y: 10 };
  s.dir = { x: -1, y: 0 };
  assert.ok(!L.occupiedFor(st.snakes, s, false).has("4,6"), "Planung: Schwanz frei");
  L.step(st); // Kopf auf (4,6) = altes Schwanzende
  assert.ok(s.alive);
  assert.equal(s.body.length, 4);
  // Frisst sie dagegen im selben Zug, ist das Schwanzende blockiert.
  assert.ok(L.occupiedFor(st.snakes, s, true).has(L.key(s.body[3])));
});

t("Gleichzeitiges Fressen: Kopf-an-Kopf, beide raus, keiner waechst, Futter bleibt", () => {
  const a = snake({ x: 4, y: 10 }, { x: 1, y: 0 }, "a");
  const b = snake({ x: 6, y: 10 }, { x: -1, y: 0 }, "b");
  const c = snake({ x: 10, y: 2 }, { x: 1, y: 0 }, "c");
  const st = state([a, b, c], { x: 5, y: 10 });
  const res = L.step(st);
  assert.equal(a.alive, false);
  assert.equal(b.alive, false);
  assert.equal(a.points + b.points, 0);
  assert.equal(a.body.length, 3);
  assert.equal(b.body.length, 3);
  assert.deepEqual(st.food, { x: 5, y: 10 }, "Futter nicht verloren");
  assert.equal(res.ate.length, 0);
  assert.ok(c.alive && c.body.length === 3 + c.points);
  // Ausgeschiedene bleiben draussen
  for (let i = 0; i < 5; i += 1) L.step(st);
  assert.equal(a.alive, false);
  assert.equal(a.body.length, 3);
});

t("Koerperkollision: scheidet aus, kein Respawn", () => {
  const a = snake({ x: 6, y: 4 }, { x: 0, y: 1 }, "a");
  const b = snake({ x: 7, y: 5 }, { x: 1, y: 0 }, "b"); // b: (7,5)(6,5)(5,5)
  const st = state([a, b], { x: 15, y: 15 });
  L.step(st); // a -> (6,5) = b-Mitte
  assert.equal(a.alive, false);
  assert.ok(b.alive);
});

t("Reset: neue Schlangen mit 3 Segmenten, Wachsen danach normal, kein grow-Rest", () => {
  let s = snake({ x: 4, y: 10 }, { x: 1, y: 0 });
  const st = state([s], { x: 5, y: 10 });
  L.step(st);
  assert.equal(s.body.length, 4);
  s = snake({ x: 4, y: 10 }, { x: 1, y: 0 });
  st.snakes = [s]; st.food = { x: 12, y: 12 };
  assert.equal(s.body.length, 3);
  assert.ok(!("grow" in s));
  L.step(st);
  assert.equal(s.body.length, 3);
  st.food = { x: 6, y: 10 };
  L.step(st);
  assert.equal(s.body.length, 4);
});

t("Simulation 12 Schlangen, fester Seed: Invariante in jedem Tick", () => {
  seed = 7;
  const snakes = Array.from({ length: 12 }, (_, i) => snake({ x: (i * 3) % C, y: (i * 7) % R }, L.DIRS[i % 4], `k${i}`));
  const st = state(snakes, null);
  st.food = L.placeFood(snakes, C, R, rng);
  for (let tick = 0; tick < 500 && snakes.some((s) => s.alive); tick += 1) {
    snakes.forEach((s) => {
      if (!s.alive) return;
      const ok = L.DIRS.filter((d) => !L.opposite(d, s.dir) && !L.occupiedFor(snakes, s, st.food && L.same(L.nextHead(s, d, C, R), st.food)).has(L.key(L.nextHead(s, d, C, R))));
      if (ok.length) s.dir = ok[Math.floor(rng() * ok.length)];
    });
    L.step(st);
    snakes.forEach((s) => { if (s.alive) assert.equal(s.body.length, 3 + s.points); });
  }
});

console.log(`\n${pass} Tests gruen`);
