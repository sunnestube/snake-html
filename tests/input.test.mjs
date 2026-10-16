// Nokia-Steuerung + Eingabepuffer (#2): node tests/input.test.mjs
import { createRequire } from "module";
import assert from "assert/strict";
const L = createRequire(import.meta.url)("../js/logic.js");
const R = { x: 1, y: 0 }, Lf = { x: -1, y: 0 }, U = { x: 0, y: -1 }, D = { x: 0, y: 1 };
let pass = 0;
const t = (name, fn) => { fn(); pass += 1; console.log("ok -", name); };
const tick = (buf, dir) => L.consumeInput(buf, dir);

t("AC2: Tabelle für alle 4 Startrichtungen, wirkt beim nächsten Tick", () => {
  const table = [
    [R, "3", U], [R, "7", D], [Lf, "3", U], [Lf, "7", D],
    [U, "3", R], [U, "7", Lf], [D, "3", R], [D, "7", Lf],
  ];
  for (const [start, k, want] of table) {
    const buf = L.createInput();
    assert.equal(L.pushNokia(buf, start, k), true);
    assert.deepEqual(tick(buf, start), want, `${JSON.stringify(start)} + ${k}`);
  }
});

t("AC3: rechts, 3+3 im selben Tick → erst hoch, dann rechts", () => {
  const buf = L.createInput();
  assert.equal(L.pushNokia(buf, R, "3"), true);
  assert.equal(L.pushNokia(buf, R, "3"), true);   // Achse aus gepufferter Richtung (hoch) → rechts
  let dir = tick(buf, R);
  assert.deepEqual(dir, U);
  dir = tick(buf, dir);
  assert.deepEqual(dir, R);
});

t("AC3: dritte Eingabe im selben Tick wird verworfen", () => {
  const buf = L.createInput();
  L.pushNokia(buf, R, "3");
  L.pushNokia(buf, R, "7");
  assert.equal(L.pushNokia(buf, R, "3"), false);
  assert.equal(buf.queue.length, 2);
  let dir = tick(buf, R); dir = tick(buf, dir);
  assert.deepEqual(dir, Lf);                       // hoch, dann links (7 auf senkrechter Achse)
  assert.deepEqual(tick(buf, dir), Lf);            // Puffer leer → Richtung bleibt
});

t("Puffer nimmt nach einem Tick wieder an", () => {
  const buf = L.createInput();
  L.pushNokia(buf, R, "3"); L.pushNokia(buf, R, "3");
  const dir = tick(buf, R);
  assert.equal(L.pushNokia(buf, dir, "7"), true);
  assert.equal(buf.queue.length, 2);
});

t("Pfeiltasten absolut, 180°-Umkehr und gleiche Richtung ignoriert", () => {
  const buf = L.createInput();
  assert.equal(L.pushDir(buf, R, Lf), false);
  assert.equal(L.pushDir(buf, R, R), false);
  assert.equal(L.pushDir(buf, R, U), true);
  assert.equal(L.pushDir(buf, R, D), false);       // Umkehr gegenüber gepuffertem "hoch"
  assert.equal(L.pushDir(buf, R, Lf), true);       // hoch → links ist erlaubt
  assert.deepEqual(tick(buf, R), U);
  assert.deepEqual(tick(buf, U), Lf);
});

t("Kehrtwende über zwei Ticks ohne Selbstkollision", () => {
  const body = L.makeBody({ x: 5, y: 5 }, R, 20, 20);
  const s = { name: "p", body, dir: R, alive: true, points: 0 };
  const st = { snakes: [s], foods: [], cols: 20, rows: 20, rng: () => 0.5, foodTarget: () => 0 };
  const buf = L.createInput();
  L.pushNokia(buf, s.dir, "3"); L.pushNokia(buf, s.dir, "3");
  for (let i = 0; i < 2; i += 1) { s.dir = L.consumeInput(buf, s.dir); L.step(st); }
  assert.equal(s.alive, true);
  assert.deepEqual(s.dir, R);
  assert.deepEqual(s.body[0], { x: 6, y: 4 });
});

console.log(`${pass} Tests grün`);
