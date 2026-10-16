// Reine Spiel-Logik ohne DOM. Im Browser als globalThis.SnakeLogic, in Node per require/vm testbar.
(function (root) {
  const DIRS = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  function wrapCoord(v, max) {
    return ((v % max) + max) % max;
  }

  function wrap(x, y, cols, rows) {
    return { x: wrapCoord(x, cols), y: wrapCoord(y, rows) };
  }

  function same(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function opposite(a, b) {
    return a.x === -b.x && a.y === -b.y;
  }

  function key(p) {
    return `${p.x},${p.y}`;
  }

  function makeBody(start, dir, cols, rows) {
    const body = [start];
    for (let i = 1; i < 3; i += 1) body.push(wrap(start.x - dir.x * i, start.y - dir.y * i, cols, rows));
    return body;
  }

  function nextHead(snake, dir, cols, rows) {
    const h = snake.body[0];
    return wrap(h.x + dir.x, h.y + dir.y, cols, rows);
  }

  // Belegte Felder fuer die Planung einer Schlange in diesem Tick.
  // Das eigene Schwanzende ist frei, ausser sie frisst genau in diesem Zug.
  function occupiedFor(snakes, self, eatsNow) {
    const cells = new Set();
    snakes.forEach((snake) => {
      if (!snake.alive) return;
      const last = snake.body.length - 1;
      snake.body.forEach((part, i) => {
        if (snake === self && i === last && !eatsNow) return;
        cells.add(key(part));
      });
    });
    return cells;
  }

  function freeCells(snakes, cols, rows, foods = []) {
    const used = new Set();
    snakes.forEach((s) => { if (s.alive) s.body.forEach((p) => used.add(key(p))); });
    foods.forEach((f) => used.add(key(f)));
    const free = [];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) if (!used.has(`${x},${y}`)) free.push({ x, y });
    }
    return free;
  }

  function placeFood(snakes, cols, rows, rng, foods = []) {
    const free = freeCells(snakes, cols, rows, foods);
    return free.length ? free[Math.floor(rng() * free.length)] : null;
  }

  // Ab diesem Anteil belegter Felder kommt kein neues Futter mehr dazu, sonst laeuft das
  // Feld mit der Zeit voll und alle Schlangen sterben zwangslaeufig.
  const MAX_FILL = 0.35;

  // Wie viele Futterfelder gleichzeitig: max(1, ceil(lebende / 2)), solange das Feld nicht zu voll ist.
  function foodTarget(snakes, cols = 20, rows = 20) {
    const alive = snakes.filter((s) => s.alive);
    // Auch ausgeschiedene Schlangen zaehlen mit: ihr Platz gibt kein neues Futter frei,
    // sonst wachsen die Uebrigen nach jedem Ausscheiden weiter und es kippt.
    const used = snakes.reduce((n, s) => n + s.body.length, 0);
    if (used >= cols * rows * MAX_FILL) return 0;
    return Math.max(1, Math.ceil(alive.length / 2));
  }

  function fillFoods(state) {
    const target = state.foodTarget ? state.foodTarget(state.snakes) : foodTarget(state.snakes, state.cols, state.rows);
    const rng = state.rng || Math.random;
    while (state.foods.length < target) {
      const f = placeFood(state.snakes, state.cols, state.rows, rng, state.foods);
      if (!f) break;
      state.foods.push(f);
    }
  }

  // Ein deterministischer Tick. Die Richtungen (snake.dir) muessen vorher gesetzt sein.
  // Ablauf: 1. Ziel-Koepfe, 2. Kollisionen inkl. Kopf-an-Kopf, 3. Fressen/Wachsen, 4. Futter setzen.
  // state.foods (Liste) oder kompatibel state.food (ein Feld).
  function step(state) {
    const single = !Array.isArray(state.foods);
    if (single) {
      state.foods = state.food ? [state.food] : [];
      if (!state.foodTarget) state.foodTarget = () => 1;
    }
    const { snakes, cols, rows } = state;
    const foodKeys = new Set(state.foods.map(key));
    const movers = snakes.filter((s) => s.alive);

    // 1. Ziel-Koepfe
    const plan = movers.map((s) => {
      const target = nextHead(s, s.dir, cols, rows);
      return { s, target, eats: foodKeys.has(key(target)) };
    });

    // 2. Kollisionen gegen den Stand vor dem Tick. Schwanzenden von Schlangen,
    //    die nicht fressen, ruecken in diesem Tick weg und gelten als frei.
    const blocked = new Set();
    plan.forEach(({ s, eats }) => {
      const last = s.body.length - 1;
      s.body.forEach((p, i) => {
        if (i === last && !eats) return;
        blocked.add(key(p));
      });
    });
    const targetCount = new Map();
    plan.forEach(({ target }) => targetCount.set(key(target), (targetCount.get(key(target)) || 0) + 1));

    const died = [];
    plan.forEach((p) => {
      const k = key(p.target);
      p.dies = blocked.has(k) || targetCount.get(k) > 1;
    });
    plan.forEach((p) => {
      if (p.dies) {
        p.s.alive = false;
        died.push(p.s);
      }
    });

    // 3. Fressen und Wachstum (nur Ueberlebende; Kopf-an-Kopf am Futter frisst niemand,
    //    pro Futterfeld kann also hoechstens eine Schlange fressen)
    const ate = [];
    const eaten = new Set();
    plan.forEach((p) => {
      if (p.dies) return;
      p.s.body.unshift(p.target);
      if (p.eats) {
        p.s.points += 1;
        ate.push(p.s);
        eaten.add(key(p.target));
      } else {
        p.s.body.pop();
      }
    });

    // 4. Futter neu setzen
    state.foods = state.foods.filter((f) => !eaten.has(key(f)));
    fillFoods(state);
    if (single) {
      state.food = state.foods[0] || null;
      delete state.foods;
    }
    return { ate, died };
  }

  // ---- Vorsichtige KI ----
  function floodArea(start, blocked, cols, rows, cap) {
    const seen = new Set([key(start)]);
    const q = [start];
    while (q.length && seen.size < cap) {
      const c = q.shift();
      for (const d of DIRS) {
        const n = wrap(c.x + d.x, c.y + d.y, cols, rows);
        const k = key(n);
        if (seen.has(k) || blocked.has(k)) continue;
        seen.add(k);
        q.push(n);
      }
    }
    return seen.size;
  }

  // Felder, die ein anderer lebender Kopf im selben Tick erreichen kann.
  function headThreats(snakes, self, cols, rows) {
    const cells = new Set();
    snakes.forEach((s) => {
      if (!s.alive || s === self) return;
      DIRS.forEach((d) => {
        if (opposite(d, s.dir)) return;
        cells.add(key(nextHead(s, d, cols, rows)));
      });
    });
    return cells;
  }

  // Zeitbewusster Flood-Fill: ein Koerperfeld wird frei, sobald der Schwanz daran vorbei ist.
  // freeAt: Map key -> Schritt, ab dem das Feld betreten werden darf.
  function timedArea(start, freeAt, cols, rows, cap, enemyDist = null) {
    const seen = new Set([key(start)]);
    let frontier = [start];
    let depth = 0;
    while (frontier.length && seen.size < cap) {
      depth += 1;
      const next = [];
      for (const c of frontier) {
        for (const d of DIRS) {
          const n = wrap(c.x + d.x, c.y + d.y, cols, rows);
          const k = key(n);
          if (seen.has(k)) continue;
          const f = freeAt.get(k);
          if (f !== undefined && f > depth) continue;
          // Felder, die ein anderer Kopf vorher oder gleichzeitig erreicht, zaehlen nicht.
          if (enemyDist && enemyDist.has(k) && enemyDist.get(k) <= depth + 1) continue;
          seen.add(k);
          next.push(n);
        }
      }
      frontier = next;
    }
    return seen.size;
  }

  // Schrittdistanz der anderen lebenden Koepfe zu jedem freien Feld (Multi-Source-BFS).
  function enemyDistances(snakes, self, cols, rows) {
    const blocked = new Set();
    snakes.forEach((s) => { if (s.alive) s.body.forEach((p) => blocked.add(key(p))); });
    const dist = new Map();
    let frontier = [];
    snakes.forEach((s) => { if (s.alive && s !== self) frontier.push(s.body[0]); });
    let d = 0;
    while (frontier.length) {
      d += 1;
      const next = [];
      for (const c of frontier) {
        for (const dir of DIRS) {
          const n = wrap(c.x + dir.x, c.y + dir.y, cols, rows);
          const k = key(n);
          if (blocked.has(k) || dist.has(k)) continue;
          dist.set(k, d);
          next.push(n);
        }
      }
      frontier = next;
    }
    return dist;
  }

  // Bewertet alle Zuege: sicher (nicht sofort toedlich), Platz (Flood-Fill >= Laenge), Kopf-Risiko.
  function rateMoves(snakes, self, foods, cols, rows) {
    const foodKeys = new Set(foods.map(key));
    const threats = headThreats(snakes, self, cols, rows);
    const enemy = enemyDistances(snakes, self, cols, rows);
    const out = [];
    DIRS.forEach((dir) => {
      if (opposite(dir, self.dir)) return;
      const target = nextHead(self, dir, cols, rows);
      const k = key(target);
      const eats = foodKeys.has(k);
      const occ = occupiedFor(snakes, self, eats);
      if (occ.has(k)) return; // sofort toedlich
      // Stand nach dem Zug
      const freeAt = new Map();
      const setFree = (cell, t) => { const kk = key(cell); freeAt.set(kk, Math.max(freeAt.get(kk) || 0, t)); };
      snakes.forEach((s) => {
        if (!s.alive || s === self) return;
        // andere Schlangen: vorsichtig als dauerhaft belegt, ebenso ihre moeglichen naechsten Kopffelder
        s.body.forEach((p) => setFree(p, Infinity));
      });
      threats.forEach((t) => { if (t !== k) { const [x, y] = t.split(",").map(Number); setFree({ x, y }, Infinity); } });
      const body = [target, ...self.body];
      if (!eats) body.pop();
      body.forEach((p, i) => setFree(p, body.length - i));
      const need = body.length;
      const cap = Math.max(need * 3, 60);
      // Nur Platz zaehlen, den diese Schlange vor allen anderen Koepfen erreicht (Voronoi).
      const area = timedArea(target, freeAt, cols, rows, cap, enemy);
      // Echter Platz ohne Voronoi: reicht er nicht fuer die eigene Laenge, ist es eine Sackgasse.
      const plain = timedArea(target, freeAt, cols, rows, need + 1);
      out.push({ dir, target, eats, area, plain, safe: plain >= need, need, risky: threats.has(k) });
    });
    const best = Math.max(0, ...out.map((m) => m.area));
    out.forEach((m) => { m.roomy = m.area >= Math.min(m.need * 2, Math.max(m.need * 3, 60)) || (m.area >= m.need && m.area >= best); });
    return out;
  }

  function bestTier(rated) {
    const tiers = [
            (m) => m.safe && m.roomy && !m.risky,
      (m) => m.safe && !m.risky,
      (m) => m.safe,
      (m) => !m.risky,
      () => true,
    ];
    for (const t of tiers) {
      const list = rated.filter(t);
      if (list.length) return list;
    }
    return [];
  }

  // BFS zum naechsten Futter; erster Schritt muss einer der erlaubten Zuege sein.
  function foodStep(snakes, self, foods, allowed, cols, rows, limit) {
    if (!foods.length || !allowed.length) return null;
    const foodKeys = new Set(foods.map(key));
    const blocked = occupiedFor(snakes, self, false);
    const q = [];
    const seen = new Set([key(self.body[0])]);
    for (const m of allowed) {
      if (m.eats) return m;
      seen.add(key(m.target));
      q.push({ p: m.target, first: m, d: 1 });
    }
    while (q.length) {
      const cur = q.shift();
      if (cur.d >= limit) continue;
      for (const d of DIRS) {
        const n = wrap(cur.p.x + d.x, cur.p.y + d.y, cols, rows);
        const k = key(n);
        if (seen.has(k) || blocked.has(k)) continue;
        if (foodKeys.has(k)) return cur.first;
        seen.add(k);
        q.push({ p: n, first: cur.first, d: cur.d + 1 });
      }
    }
    return null;
  }

  function chooseMove(snakes, self, foods, cols, rows, rng = Math.random) {
    const rated = rateMoves(snakes, self, foods, cols, rows);
    if (!rated.length) return self.dir;
    const tier = bestTier(rated);
    const skill = self.skill == null ? 1 : self.skill;
    // Futter nur jagen, wenn der Platz sicher reicht; sonst den Zug mit dem meisten Platz.
    if (tier[0].roomy && rng() <= skill) {
      const m = foodStep(snakes, self, foods, tier, cols, rows, self.look || 20);
      if (m) return m.dir;
    }
    // Sonst: Zug mit dem meisten Platz, bei Gleichstand per Zufall
    const val = (m) => m.area * 1000 + m.plain;
    const maxArea = Math.max(...tier.map(val));
    const top = tier.filter((m) => val(m) === maxArea);
    return top[Math.floor(rng() * top.length)].dir;
  }


  // Nokia-Steuerung (#2): absolut je nach Achse. "3" (rechts): waagrecht → hoch, senkrecht → rechts.
  // "7" (links): waagrecht → runter, senkrecht → links.
  const INPUT_MAX = 2;
  function nokiaDir(base, k) {
    const horizontal = base.x !== 0;
    if (k === "3") return horizontal ? { x: 0, y: -1 } : { x: 1, y: 0 };
    if (k === "7") return horizontal ? { x: 0, y: 1 } : { x: -1, y: 0 };
    return null;
  }
  function createInput() {
    return { queue: [] };
  }
  // Achse der naechsten Eingabe = zuletzt gepufferte Richtung, sonst die aktuelle.
  function inputBase(buf, current) {
    return buf.queue.length ? buf.queue[buf.queue.length - 1] : current;
  }
  function pushDir(buf, current, d) {
    if (!d || buf.queue.length >= INPUT_MAX) return false;
    const base = inputBase(buf, current);
    if (same(d, base) || opposite(d, base)) return false;   // keine 180°-Umkehr, kein Leer-Eintrag
    buf.queue.push({ x: d.x, y: d.y });
    return true;
  }
  function pushNokia(buf, current, k) {
    if (buf.queue.length >= INPUT_MAX) return false;
    return pushDir(buf, current, nokiaDir(inputBase(buf, current), k));
  }
  // Pro Tick genau eine gepufferte Eingabe anwenden.
  function consumeInput(buf, current) {
    return buf.queue.length ? buf.queue.shift() : current;
  }

  const api = { INPUT_MAX, nokiaDir, createInput, pushDir, pushNokia, consumeInput, MAX_FILL, DIRS, wrapCoord, wrap, same, opposite, key, makeBody, nextHead, occupiedFor, placeFood, foodTarget, fillFoods, step, floodArea, timedArea, enemyDistances, headThreats, rateMoves, chooseMove };
  root.SnakeLogic = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
