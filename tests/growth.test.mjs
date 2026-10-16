// Deterministischer Test der Wachs-Logik: node tests/growth.test.mjs
import { createRequire } from "module";
import assert from "assert/strict";
import { readFileSync } from "fs";
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

// ---- Vorsichtige KI und mehr Futter ----
t("KI waehlt keinen sofort toedlichen Zug, solange es einen sicheren gibt", () => {
  // Kopf (5,5) nach rechts, rechts und oben blockiert von einer anderen Schlange
  const me = { name: "me", body: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }], dir: { x: 1, y: 0 }, alive: true, points: 0, skill: 1, look: 20 };
  const wall = { name: "w", body: [{ x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 4 }], dir: { x: 0, y: 1 }, alive: true, points: 2 };
  for (let i = 0; i < 20; i += 1) {
    const d = L.chooseMove([me, wall], me, [{ x: 7, y: 5 }], C, R, rng);
    assert.deepEqual(d, { x: 0, y: 1 });
  }
});

t("KI meidet Sackgassen (Flood-Fill), auch wenn dort Futter liegt", () => {
  // Tasche oben: (5,4) ist nur 1 Feld gross, Futter liegt darin
  const me = { name: "me", body: [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 5, y: 7 }, { x: 5, y: 8 }], dir: { x: 0, y: -1 }, alive: true, points: 1, skill: 1, look: 20 };
  const box = { name: "b", body: [{ x: 4, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 }, { x: 6, y: 4 }, { x: 4, y: 4 }], dir: { x: 1, y: 0 }, alive: true, points: 2 };
  for (let i = 0; i < 20; i += 1) {
    const d = L.chooseMove([me, box], me, [{ x: 5, y: 4 }], C, R, rng);
    assert.notDeepEqual(d, { x: 0, y: -1 });
  }
});

t("KI weicht Kopf-an-Kopf aus, wenn es eine Alternative gibt", () => {
  const me = snake({ x: 4, y: 10 }, { x: 1, y: 0 }, "me");
  me.skill = 1; me.look = 20;
  const other = snake({ x: 6, y: 10 }, { x: -1, y: 0 }, "o");
  for (let i = 0; i < 20; i += 1) {
    const d = L.chooseMove([me, other], me, [{ x: 5, y: 10 }], C, R, rng);
    assert.notDeepEqual(d, { x: 1, y: 0 }, "nicht ins umkaempfte Futterfeld");
  }
});

t("Mehr Futter: max(1, ceil(lebende/2)), nichts verloren, nichts doppelt", () => {
  const list = Array.from({ length: 5 }, (_, i) => snake({ x: 2 + i * 3, y: 5 }, { x: 0, y: 1 }, `m${i}`));
  const st = { snakes: list, foods: [], cols: C, rows: R, rng };
  L.fillFoods(st);
  assert.equal(st.foods.length, 3);
  assert.equal(new Set(st.foods.map(L.key)).size, 3, "keine doppelten Futterfelder");
  // zwei Schlangen fressen je ein anderes Futter im selben Tick
  st.foods = [{ x: 2, y: 6 }, { x: 5, y: 6 }, { x: 15, y: 15 }];
  const res = L.step(st);
  assert.equal(res.ate.length, 2);
  assert.equal(list[0].points + list[1].points, 2);
  assert.equal(st.foods.length, 3, "aufgefuellt");
  assert.ok(st.foods.some((f) => L.same(f, { x: 15, y: 15 })), "nicht gefressenes Futter bleibt");
  list.forEach((s) => assert.equal(s.body.length, 3 + s.points));
});

// Schwarm wie in js/game.js: 12 KIs, Profile und Tempo aus game.js gelesen.
const src = readFileSync(new URL("../js/game.js", import.meta.url), "utf8");
const simTick = Number(/sim:\s*\{[^}]*tick:\s*(\d+)/.exec(src)[1]);
const simSteps = Number(/diff === "sim" \? (\d+) : 1/.exec(src)[1]);
const swarmCount = Number(/mode === "swarm" \? (\d+) :/.exec(src)[1]);
const profiles = [...src.matchAll(/skill:\s*([\d.]+),\s*look:\s*(\d+)/g)].map((m) => ({ skill: Number(m[1]), look: Number(m[2]) }));
const TICKS = Math.round((60000 / simTick) * simSteps);

function swarmRun(seedValue) {
  let sv = seedValue;
  const r = () => ((sv = (sv * 1103515245 + 12345) % 2147483648) / 2147483648);
  const list = [];
  for (let i = 0; i < swarmCount; i += 1) {
    const p = profiles[i % profiles.length];
    const start = { x: Math.floor(r() * C), y: Math.floor(r() * R) };
    const dir = L.DIRS[Math.floor(r() * 4)];
    list.push({ name: `k${i}`, body: L.makeBody(start, dir, C, R), dir, alive: true, points: 0, skill: p.skill, look: p.look });
  }
  const st = { snakes: list, foods: [], cols: C, rows: R, rng: r };
  L.fillFoods(st);
  for (let tick = 0; tick < TICKS; tick += 1) {
    list.forEach((s) => { if (s.alive) s.dir = L.chooseMove(list, s, st.foods, C, R, r); });
    L.step(st);
    list.forEach((s) => { if (s.alive) assert.equal(s.body.length, 3 + s.points); });
    assert.equal(new Set(st.foods.map(L.key)).size, st.foods.length);
  }
  const alive = list.filter((s) => s.alive);
  return { alive: alive.length, longest: Math.max(0, ...alive.map((s) => s.body.length)) };
}

for (const sd of [1, 2, 3, 4, 5, 6]) {
  t(`Schwarm ${swarmCount} KIs, 60 s Sim = ${TICKS} Ticks, Seed ${sd}: >= 6 leben, laengste >= 15`, () => {
    const res = swarmRun(sd);
    console.log(`     Seed ${sd}: ${res.alive} leben, laengste ${res.longest}`);
    assert.ok(res.alive >= 6, `nur ${res.alive} leben`);
    assert.ok(res.longest >= 15, `laengste nur ${res.longest}`);
  });
}

console.log(`\n${pass} Tests gruen`);
