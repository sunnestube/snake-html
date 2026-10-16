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

  function freeCells(snakes, cols, rows) {
    const used = new Set();
    snakes.forEach((s) => { if (s.alive) s.body.forEach((p) => used.add(key(p))); });
    const free = [];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) if (!used.has(`${x},${y}`)) free.push({ x, y });
    }
    return free;
  }

  function placeFood(snakes, cols, rows, rng) {
    const free = freeCells(snakes, cols, rows);
    return free.length ? free[Math.floor(rng() * free.length)] : null;
  }

  // Ein deterministischer Tick. Die Richtungen (snake.dir) muessen vorher gesetzt sein.
  // Ablauf: 1. Ziel-Koepfe, 2. Kollisionen inkl. Kopf-an-Kopf, 3. Fressen/Wachsen, 4. Futter setzen.
  function step(state) {
    const { snakes, cols, rows } = state;
    const food = state.food;
    const movers = snakes.filter((s) => s.alive);

    // 1. Ziel-Koepfe
    const plan = movers.map((s) => {
      const target = nextHead(s, s.dir, cols, rows);
      return { s, target, eats: !!food && same(target, food) };
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

    // 3. Fressen und Wachstum (nur Ueberlebende; Kopf-an-Kopf am Futter frisst niemand)
    const ate = [];
    plan.forEach((p) => {
      if (p.dies) return;
      p.s.body.unshift(p.target);
      if (p.eats) {
        p.s.points += 1;
        ate.push(p.s);
      } else {
        p.s.body.pop();
      }
    });

    // 4. Futter neu setzen
    if (ate.length || !state.food) state.food = placeFood(snakes, cols, rows, state.rng || Math.random);
    return { ate, died };
  }

  const api = { DIRS, wrapCoord, wrap, same, opposite, key, makeBody, nextHead, occupiedFor, placeFood, step };
  root.SnakeLogic = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
