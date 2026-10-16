// Zurück zum Startbildschirm (#5): nach mehrmaligem Start/Pause/Zurück genau ein Timer, Tick-Rate unverändert.
import { createRequire } from "module";
import assert from "assert/strict";
const L = createRequire(import.meta.url)("../js/logic.js");
let pass = 0;
const t = (name, fn) => { fn(); pass += 1; console.log("ok -", name); };

// Fake-Uhr: zählt aktive Timer und erlaubt kontrolliertes Vorspulen.
function fakeTimers() {
  let now = 0, seq = 0;
  const pending = new Map();
  return {
    set(fn, ms) { const id = ++seq; pending.set(id, { at: now + ms, fn }); return id; },
    clear(id) { pending.delete(id); },
    get active() { return pending.size; },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        let next = null;
        for (const [id, x] of pending) if (x.at <= end && (!next || x.at < next[1].at)) next = [id, x];
        if (!next) break;
        pending.delete(next[0]); now = next[1].at; next[1].fn();
      }
      now = end;
    },
  };
}

t("Start → Zurück × 10, dann Spiel: genau 1 Timer und normale Tick-Rate", () => {
  const timers = fakeTimers();
  let ticks = 0;
  const loop = L.createLoop(() => { ticks += 1; }, () => 100, timers);
  for (let i = 0; i < 10; i += 1) {
    loop.start(); timers.advance(250); loop.pause(); loop.stop();   // Spiel → Pause → Startbildschirm
    assert.equal(timers.active, 0, `nach Zurück #${i + 1} kein Timer`);
  }
  ticks = 0;
  loop.start();
  assert.equal(timers.active, 1);
  timers.advance(1000);
  assert.equal(ticks, 11, "1 Sofort-Tick + 10 in 1000 ms bei 100 ms – keine doppelte Geschwindigkeit");
  assert.equal(timers.active, 1);
});

t("Mehrfaches start() ohne stop() stapelt keine Timer", () => {
  const timers = fakeTimers();
  let ticks = 0;
  const loop = L.createLoop(() => { ticks += 1; }, () => 50, timers);
  for (let i = 0; i < 5; i += 1) loop.start();
  assert.equal(timers.active, 1);
  ticks = 0; timers.advance(500);
  assert.equal(ticks, 10);
});

t("Pause/Weiter mehrfach: 0 Timer in Pause, 1 danach; resume() ohne Pause ist wirkungslos", () => {
  const timers = fakeTimers();
  let ticks = 0;
  const loop = L.createLoop(() => { ticks += 1; }, () => 100, timers);
  loop.start();
  for (let i = 0; i < 5; i += 1) { loop.pause(); loop.pause(); assert.equal(timers.active, 0); loop.resume(); loop.resume(); assert.equal(timers.active, 1); }
  assert.equal(loop.state, "running");
  ticks = 0; timers.advance(1000);
  assert.equal(ticks, 10);
});

t("stop() im Tick (Game Over) hinterlässt keinen Timer; Neustart läuft normal", () => {
  const timers = fakeTimers();
  let ticks = 0;
  const loop = L.createLoop(() => { ticks += 1; if (ticks === 3) loop.stop(); }, () => 100, timers);
  loop.start(); timers.advance(1000);
  assert.equal(ticks, 3); assert.equal(timers.active, 0); assert.equal(loop.state, "idle");
  loop.start(); assert.equal(timers.active, 1);
});

t("Neues Spiel: Eingabepuffer leer, Richtung/Länge wie beim Start", () => {
  const buf = L.createInput();
  L.pushNokia(buf, { x: 1, y: 0 }, "3"); L.pushNokia(buf, { x: 1, y: 0 }, "7");
  const fresh = L.createInput();
  assert.equal(fresh.queue.length, 0);
  assert.equal(L.makeBody({ x: 4, y: 10 }, { x: 1, y: 0 }, 20, 20).length, 3);
});

console.log(`${pass} Tests ok`);
