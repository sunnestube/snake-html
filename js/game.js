const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highEl = document.getElementById("high");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startBtn = document.getElementById("start");
const setupEl = document.getElementById("setup");
const legendEl = document.getElementById("legend");
const hintEl = document.getElementById("hint");
const pauseBtn = document.getElementById("pause");

const COLS = 20;
const ROWS = 20;
const HIGH_KEY = "snake-html-high";
const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const DIFFS = {
  easy: { label: "Leicht", tick: 180 },
  normal: { label: "Normal", tick: 130 },
  hard: { label: "Schwer", tick: 90 },
  turbo: { label: "Turbo", tick: 60 },
};

const AI_PROFILES = {
  weak: { name: "Anfänger", skill: 0.22, look: 4, color: "#6aa8e8", head: "#c5ddf6" },
  mid: { name: "Mittel", skill: 0.55, look: 8, color: "#d6b04c", head: "#f3e3a6" },
  good: { name: "Profi", skill: 0.82, look: 14, color: "#c17be0", head: "#e8c6f6" },
  ace: { name: "Meister", skill: 0.97, look: 28, color: "#e07a4d", head: "#f5c2a8" },
};

const PLAYER = { name: "Du", color: "#7dce6a", head: "#c6f5b8" };

let mode = "solo";
let diff = "normal";
let snakes = [];
let food = { x: 12, y: 10 };
let score = 0;
let high = Number(localStorage.getItem(HIGH_KEY) || 0);
let running = false;
let paused = false;
let loopId = null;
let tickMs = DIFFS.normal.tick;
let touchStart = null;
let tile = 20;

highEl.textContent = high;

function wrapCoord(v, max) {
  return ((v % max) + max) % max;
}

function wrap(x, y) {
  return { x: wrapCoord(x, COLS), y: wrapCoord(y, ROWS) };
}

function same(a, b) {
  return a.x === b.x && a.y === b.y;
}

function distWrap(a, b) {
  const dx = Math.min(Math.abs(a.x - b.x), COLS - Math.abs(a.x - b.x));
  const dy = Math.min(Math.abs(a.y - b.y), ROWS - Math.abs(a.y - b.y));
  return dx + dy;
}

function opposite(a, b) {
  return a.x === -b.x && a.y === -b.y;
}

function occupied(exceptTailOf = null) {
  const cells = new Set();
  snakes.forEach((snake) => {
    if (!snake.alive) return;
    snake.body.forEach((part, i) => {
      if (exceptTailOf === snake && i === snake.body.length - 1 && !snake.grow) return;
      cells.add(`${part.x},${part.y}`);
    });
  });
  return cells;
}

function blockedAt(x, y, skipTailOf) {
  return occupied(skipTailOf).has(`${x},${y}`);
}

function placeFood() {
  const used = occupied();
  const free = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (!used.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  food = free.length ? free[Math.floor(Math.random() * free.length)] : { x: 0, y: 0 };
}

function makeSnake(kind, start, dir, profile) {
  const body = [start];
  for (let i = 1; i < 3; i += 1) {
    body.push(wrap(start.x - dir.x * i, start.y - dir.y * i));
  }
  return {
    kind,
    name: profile.name,
    color: profile.color,
    head: profile.head,
    skill: profile.skill || 1,
    look: profile.look || 20,
    body,
    dir,
    nextDir: { ...dir },
    alive: true,
    grow: false,
    points: 0,
    respawn: 0,
    start,
    startDir: { ...dir },
  };
}

function layoutSnakes() {
  const player = makeSnake("player", { x: 4, y: 10 }, { x: 1, y: 0 }, PLAYER);
  const weak = makeSnake("ai", { x: 15, y: 4 }, { x: -1, y: 0 }, AI_PROFILES.weak);
  const mid = makeSnake("ai", { x: 15, y: 15 }, { x: 0, y: -1 }, AI_PROFILES.mid);
  const good = makeSnake("ai", { x: 4, y: 15 }, { x: 0, y: -1 }, AI_PROFILES.good);
  const ace = makeSnake("ai", { x: 10, y: 3 }, { x: 0, y: 1 }, AI_PROFILES.ace);

  if (mode === "solo") return [player];
  if (mode === "arena") return [player, weak, ace];
  return [weak, mid, good, ace];
}

function renderLegend() {
  legendEl.innerHTML = snakes.map((snake) => (
    `<li><span class="swatch" style="background:${snake.color}"></span>${snake.name} <strong data-p="${snake.name}">${snake.points}</strong></li>`
  )).join("");
}

function updateLegend() {
  snakes.forEach((snake) => {
    const el = legendEl.querySelector(`[data-p="${snake.name}"]`);
    if (el) el.textContent = snake.points;
  });
}

function playerSnake() {
  return snakes.find((s) => s.kind === "player");
}

function setPlayerDir(x, y) {
  const me = playerSnake();
  if (!me || !me.alive) return;
  if (opposite({ x, y }, me.dir)) return;
  me.nextDir = { x, y };
}

function validMoves(snake) {
  return DIRS.filter((dir) => {
    if (opposite(dir, snake.dir)) return false;
    const next = wrap(snake.body[0].x + dir.x, snake.body[0].y + dir.y);
    return !blockedAt(next.x, next.y, snake);
  });
}

function bfsNext(snake, goal, limit) {
  const start = snake.body[0];
  const blocked = occupied(snake);
  const q = [{ x: start.x, y: start.y, first: null, d: 0 }];
  const seen = new Set([`${start.x},${start.y}`]);
  let fallback = null;

  while (q.length) {
    const cur = q.shift();
    if (cur.d >= limit) continue;
    for (const dir of DIRS) {
      const nx = wrapCoord(cur.x + dir.x, COLS);
      const ny = wrapCoord(cur.y + dir.y, ROWS);
      const key = `${nx},${ny}`;
      if (seen.has(key) || blocked.has(key)) continue;
      const first = cur.first || dir;
      if (nx === goal.x && ny === goal.y) return first;
      seen.add(key);
      q.push({ x: nx, y: ny, first, d: cur.d + 1 });
      if (!fallback) fallback = first;
    }
  }
  return fallback;
}

function safestMove(snake, moves) {
  let best = moves[0];
  let bestScore = -Infinity;
  moves.forEach((dir) => {
    const next = wrap(snake.body[0].x + dir.x, snake.body[0].y + dir.y);
    const room = DIRS.filter((d) => {
      const n2 = wrap(next.x + d.x, next.y + d.y);
      return !blockedAt(n2.x, n2.y, snake);
    }).length;
    const toward = -distWrap(next, food);
    const scoreMove = room * 3 + toward;
    if (scoreMove > bestScore) {
      bestScore = scoreMove;
      best = dir;
    }
  });
  return best;
}

function think(snake) {
  const moves = validMoves(snake);
  if (!moves.length) return snake.dir;
  if (Math.random() > snake.skill) {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  const path = bfsNext(snake, food, snake.look);
  if (path && moves.some((m) => m.x === path.x && m.y === path.y)) return path;
  return safestMove(snake, moves);
}

function stepSnake(snake) {
  if (!snake.alive) {
    snake.respawn -= 1;
    if (snake.respawn <= 0 && mode === "auto") respawn(snake);
    return;
  }

  if (snake.kind === "ai") snake.nextDir = think(snake);
  if (!opposite(snake.nextDir, snake.dir)) snake.dir = snake.nextDir;

  const head = wrap(snake.body[0].x + snake.dir.x, snake.body[0].y + snake.dir.y);
  if (blockedAt(head.x, head.y, snake)) {
    snake.alive = false;
    snake.respawn = 18;
    return;
  }

  snake.body.unshift(head);
  if (same(head, food)) {
    snake.grow = true;
    snake.points += 1;
    if (snake.kind === "player") {
      score = snake.points;
      scoreEl.textContent = String(score);
      if (score > high) {
        high = score;
        highEl.textContent = String(high);
        localStorage.setItem(HIGH_KEY, String(high));
      }
    }
    placeFood();
  } else {
    snake.grow = false;
    snake.body.pop();
  }
}

function respawn(snake) {
  const used = occupied();
  const spot = wrap(snake.start.x, snake.start.y);
  if (used.has(`${spot.x},${spot.y}`)) return;
  snake.body = [
    spot,
    wrap(spot.x - snake.startDir.x, spot.y - snake.startDir.y),
    wrap(spot.x - snake.startDir.x * 2, spot.y - snake.startDir.y * 2),
  ];
  snake.dir = { ...snake.startDir };
  snake.nextDir = { ...snake.startDir };
  snake.alive = true;
  snake.grow = false;
}

function resize() {
  const box = canvas.getBoundingClientRect();
  const size = Math.max(200, Math.floor(Math.min(box.width, box.height) || 400));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  tile = (size * dpr) / COLS;
  draw();
}

function drawCell(x, y, color) {
  const g = Math.max(1, tile * 0.08);
  ctx.fillStyle = color;
  ctx.fillRect(x * tile + g, y * tile + g, tile - g * 2, tile - g * 2);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#1c261e";
  ctx.lineWidth = Math.max(1, tile * 0.03);
  for (let i = 1; i < COLS; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * tile, 0);
    ctx.lineTo(i * tile, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * tile);
    ctx.lineTo(canvas.width, i * tile);
    ctx.stroke();
  }

  drawCell(food.x, food.y, "#e85d4c");
  snakes.forEach((snake) => {
    if (!snake.alive) return;
    snake.body.forEach((part, i) => {
      drawCell(part.x, part.y, i === 0 ? snake.head : snake.color);
    });
  });
}

function step() {
  snakes.forEach(stepSnake);
  const heads = snakes.filter((s) => s.alive).map((s) => s.body[0]);
  snakes.forEach((snake) => {
    if (!snake.alive) return;
    const hits = heads.filter((h) => same(h, snake.body[0])).length;
    if (hits > 1) {
      snake.alive = false;
      snake.respawn = 18;
    }
  });
  updateLegend();
  draw();

  const me = playerSnake();
  if (mode !== "auto" && me && !me.alive) {
    endGame();
  }
}

function loop() {
  if (!running || paused) return;
  step();
  if (running) loopId = setTimeout(loop, tickMs);
}

function showOverlay(title, text, button, showSetup) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startBtn.textContent = button;
  setupEl.classList.toggle("hidden", !showSetup);
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function reset() {
  tickMs = DIFFS[diff].tick;
  score = 0;
  paused = false;
  scoreEl.textContent = "0";
  snakes = layoutSnakes();
  placeFood();
  renderLegend();
  draw();
}

function startGame() {
  clearTimeout(loopId);
  reset();
  running = true;
  hideOverlay();
  hintEl.textContent = mode === "auto"
    ? "Automatik: vier KIs, von schwach bis stark. Über die Kante gehts vis-à-vis weiter."
    : "Über die Kante startest du gegenüber. P oder Pause-Taste hält an.";
  loop();
}

function endGame() {
  running = false;
  clearTimeout(loopId);
  const extra = mode === "arena"
    ? ` KI-Punkte: ${snakes.filter((s) => s.kind === "ai").map((s) => `${s.name} ${s.points}`).join(", ")}.`
    : "";
  showOverlay("Game Over", `Punkte: ${score}.${extra} Nochmal?`, "Nochmal", true);
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  if (paused) {
    clearTimeout(loopId);
    showOverlay("Pause", "Weiter mit P, Leertaste oder der Pause-Taste.", "Weiter", false);
  } else {
    hideOverlay();
    loop();
  }
}

document.getElementById("mode-chips").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-mode]");
  if (!btn) return;
  mode = btn.dataset.mode;
  document.querySelectorAll("[data-mode]").forEach((el) => el.classList.toggle("active", el === btn));
});

document.getElementById("diff-chips").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-diff]");
  if (!btn) return;
  diff = btn.dataset.diff;
  document.querySelectorAll("[data-diff]").forEach((el) => el.classList.toggle("active", el === btn));
});

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const used = ["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "p"];
  if (used.includes(key)) event.preventDefault();
  if (key === "arrowup" || key === "w") setPlayerDir(0, -1);
  if (key === "arrowdown" || key === "s") setPlayerDir(0, 1);
  if (key === "arrowleft" || key === "a") setPlayerDir(-1, 0);
  if (key === "arrowright" || key === "d") setPlayerDir(1, 0);
  if (key === " " || key === "enter") {
    if (!running) startGame();
    else if (paused) togglePause();
  }
  if (key === "p") togglePause();
});

startBtn.addEventListener("click", () => {
  if (paused) togglePause();
  else startGame();
});

pauseBtn.addEventListener("click", () => {
  if (!running) startGame();
  else togglePause();
});

document.getElementById("pad").addEventListener("pointerdown", (event) => {
  const btn = event.target.closest("[data-dir]");
  if (!btn) return;
  event.preventDefault();
  const map = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
  };
  const dir = map[btn.dataset.dir];
  if (dir) setPlayerDir(dir[0], dir[1]);
});

canvas.addEventListener("pointerdown", (event) => {
  touchStart = { x: event.clientX, y: event.clientY };
}, { passive: true });

canvas.addEventListener("pointerup", (event) => {
  if (!touchStart) return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
  if (Math.abs(dx) > Math.abs(dy)) setPlayerDir(dx > 0 ? 1 : -1, 0);
  else setPlayerDir(0, dy > 0 ? 1 : -1);
});

window.addEventListener("resize", resize);
reset();
resize();
showOverlay(
  "Snake",
  "Kante wrappt zur Gegenseite. Solo, Arena gegen KIs oder Automatik mit vier Schlangen.",
  "Start",
  true
);
