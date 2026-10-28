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
const HINT_TEXT = hintEl.textContent.trim().replace(/\s+/g, " ");
const pauseBtn = document.getElementById("pause");
const boardWrap = document.querySelector(".board-wrap");

const L = globalThis.SnakeLogic;
let COLS = 20;
let ROWS = 20;
const MIN_CELLS = 20;   // kürzere Seite; die längere füllt den Bildschirm (#2)
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
  sim: { label: "Sim", tick: 20 },
};

const AI_PROFILES = {
  weak: { name: "Anfänger", skill: 0.22, look: 4, color: "#2b4a7a", head: "#16304f" },
  mid: { name: "Mittel", skill: 0.55, look: 8, color: "#6b5410", head: "#463600" },
  good: { name: "Profi", skill: 0.82, look: 14, color: "#5b2b72", head: "#3a1650" },
  ace: { name: "Meister", skill: 0.97, look: 28, color: "#7a3416", head: "#521f08" },
  chaos: { name: "Chaos", skill: 0.1, look: 2, color: "#4a4a4a", head: "#2a2a2a" },
  sniper: { name: "Sniper", skill: 0.9, look: 40, color: "#7a1a1a", head: "#520c0c" },
};

const PLAYER = { name: "Du", color: "#2f3f22", head: "#1f2b16" };   // LCD-Tinte (#3)
const PROFILE_KEYS = Object.keys(AI_PROFILES);

let mode = "solo";
let diff = "normal";
let snakes = [];
let foods = [];
let score = 0;
let high = Number(localStorage.getItem(HIGH_KEY) || 0);
let running = false;
let paused = false;
let tickMs = DIFFS.normal.tick;
let input = L.createInput();
let tile = 20;
let vibe = localStorage.getItem("snake-html-vibe") === "1";   // #4: Standard aus
const zoneL = document.getElementById("zone-l");
const zoneR = document.getElementById("zone-r");
const vibeBtn = document.getElementById("vibe");
let offX = 0;
let offY = 0;
let landscape = innerWidth > innerHeight;
let simSteps = 1;

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

function opposite(a, b) {
  return a.x === -b.x && a.y === -b.y;
}

// Solo: ein Futter wie bisher; sonst skaliert die Zahl mit den lebenden Schlangen.
function foodTargetFor(list) {
  if (mode === "solo") return 1;
  return L.foodTarget(list, COLS, ROWS);
}

function placeFood() {
  foods = [];
  const state = { snakes, foods, cols: COLS, rows: ROWS, rng: Math.random, foodTarget: foodTargetFor };
  L.fillFoods(state);
  foods = state.foods;
}

function makeSnake(kind, start, dir, profile, id = 0) {
  const name = profile.name + (id ? ` ${id}` : "");
  return {
    kind,
    name,
    color: profile.color,
    head: profile.head,
    skill: profile.skill || 1,
    look: profile.look || 20,
    body: L.makeBody(start, dir, COLS, ROWS),
    dir,
    nextDir: { ...dir },
    alive: true,
    points: 0,
  };
}

function randomStart() {
  return {
    x: Math.floor(Math.random() * COLS),
    y: Math.floor(Math.random() * ROWS),
    dir: DIRS[Math.floor(Math.random() * DIRS.length)],
  };
}

function layoutSnakes() {
  const list = [];
  if (mode === "solo") {
    list.push(makeSnake("player", { x: 4, y: 10 }, { x: 1, y: 0 }, PLAYER));
  } else if (mode === "arena") {
    list.push(makeSnake("player", { x: 4, y: 10 }, { x: 1, y: 0 }, PLAYER));
    list.push(makeSnake("ai", { x: 15, y: 4 }, { x: -1, y: 0 }, AI_PROFILES.weak, 1));
    list.push(makeSnake("ai", { x: 10, y: 3 }, { x: 0, y: 1 }, AI_PROFILES.ace, 1));
    list.push(makeSnake("ai", { x: 15, y: 15 }, { x: 0, y: -1 }, AI_PROFILES.mid, 1));
  } else {
    // auto / swarm: viele KIs
    const count = mode === "swarm" ? 12 : 8;
    for (let i = 0; i < count; i += 1) {
      const key = PROFILE_KEYS[i % PROFILE_KEYS.length];
      const p = AI_PROFILES[key];
      const s = randomStart();
      list.push(makeSnake("ai", { x: s.x, y: s.y }, s.dir, p, i + 1));
    }
  }
  return list;
}

function legendItem(snake, i) {
  const status = snake.alive
    ? `<strong>${snake.points}</strong>`
    : `<strong title="Ausgeschieden">✝ ${snake.body.length}</strong>`;
  return `<li data-i="${i}" class="${snake.alive ? "" : "out"}"><span class="swatch" style="background:${snake.color}"></span><span class="name">${snake.name}</span> ${status}</li>`;
}

function renderLegend() {
  legendEl.innerHTML = snakes.map(legendItem).join("");
}

function updateLegend() {
  snakes.forEach((snake, i) => {
    const el = legendEl.querySelector(`[data-i="${i}"]`);
    if (!el) return;
    const html = legendItem(snake, i);
    if (el.outerHTML !== html) el.outerHTML = html;
  });
}

function playerSnake() {
  return snakes.find((s) => s.kind === "player");
}

// Absolut (Pfeile/WASD): 180°-Umkehr wird ignoriert. Gepuffert, max. 2 pro Tick.
function setPlayerDir(x, y) {
  const me = playerSnake();
  if (!me || !me.alive || !running || paused) return;
  L.pushDir(input, me.dir, { x, y });
}

// Nokia (#2): "3"/rechte Hälfte, "7"/linke Hälfte – Achse aus der zuletzt gepufferten Richtung.
function nokia(k) {
  const me = playerSnake();
  if (!me || !me.alive || !running || paused) return false;
  return L.pushNokia(input, me.dir, k);
}

function chooseDir(snake) {
  if (snake.kind === "player") {
    snake.dir = L.consumeInput(input, snake.dir);
    return;
  }
  if (snake.kind === "ai") snake.nextDir = L.chooseMove(snakes, snake, foods, COLS, ROWS, Math.random);
  if (!opposite(snake.nextDir, snake.dir)) snake.dir = snake.nextDir;
}

function isPhone() {
  return matchMedia("(pointer: coarse), (max-width: 720px)").matches;
}

// Raster beim Spielstart: Handy füllt den Bildschirm (kürzere Seite = 20 Felder), Desktop bleibt 20×20.
function chooseGrid() {
  const box = boardWrap.getBoundingClientRect();
  if (!isPhone() || !box.width || !box.height) { COLS = MIN_CELLS; ROWS = MIN_CELLS; return; }
  const short = Math.min(box.width, box.height);
  const cell = short / MIN_CELLS;
  COLS = Math.max(MIN_CELLS, Math.floor(box.width / cell));
  ROWS = Math.max(MIN_CELLS, Math.floor(box.height / cell));
}

// Canvas füllt die Fläche; das Raster bleibt beim Drehen gleich und wird eingepasst (kein Neustart).
function resize() {
  const w = Math.max(100, Math.floor(boardWrap.clientWidth || 400));
  const h = Math.max(100, Math.floor(boardWrap.clientHeight || 400));
  // Scharf (#3): ganzzahlige CSS-Zellen, Backing-Store = CSS-Grösse × devicePixelRatio, Feld mittig.
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const cssCell = Math.max(1, Math.floor(Math.min(w / COLS, h / ROWS)));
  tile = Math.round(cssCell * dpr);
  offX = Math.floor((canvas.width - tile * COLS) / 2);
  offY = Math.floor((canvas.height - tile * ROWS) / 2);
  draw();
}

function drawCell(x, y, color) {
  const g = Math.max(1, Math.round(tile * 0.08));
  ctx.fillStyle = color;
  ctx.fillRect(offX + x * tile + g, offY + y * tile + g, tile - g * 2, tile - g * 2);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#c7d9a4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#bccf98";
  ctx.lineWidth = 1;
  const W = tile * COLS, H = tile * ROWS;
  for (let i = 1; i < COLS; i += 1) {
    ctx.beginPath();
    ctx.moveTo(offX + i * tile, offY);
    ctx.lineTo(offX + i * tile, offY + H);
    ctx.stroke();
  }
  for (let i = 1; i < ROWS; i += 1) {
    ctx.beginPath();
    ctx.moveTo(offX, offY + i * tile);
    ctx.lineTo(offX + W, offY + i * tile);
    ctx.stroke();
  }

  ctx.strokeStyle = "#1f2b16";
  ctx.lineWidth = Math.max(1, Math.round(tile * 0.06));
  ctx.strokeRect(offX + 0.5, offY + 0.5, tile * COLS - 1, tile * ROWS - 1);
  foods.forEach((f) => drawCell(f.x, f.y, "#5a2a1a"));
  snakes.forEach((snake) => {
    if (!snake.alive) return;
    snake.body.forEach((part, i) => {
      drawCell(part.x, part.y, i === 0 ? snake.head : snake.color);
    });
  });
}

function step() {
  snakes.forEach((snake) => { if (snake.alive) chooseDir(snake); });
  const state = { snakes, foods, cols: COLS, rows: ROWS, rng: Math.random, foodTarget: foodTargetFor };
  const { ate } = L.step(state);
  foods = state.foods;
  const me = playerSnake();
  if (me && ate.includes(me)) {
    score = me.points;
    scoreEl.textContent = String(score);
    if (score > high) {
      high = score;
      highEl.textContent = String(high);
      localStorage.setItem(HIGH_KEY, String(high));
    }
  }
  updateLegend();
  if (diff !== "sim" || Math.random() < 0.3) draw();

  if (mode !== "auto" && mode !== "swarm" && me && !me.alive) {
    draw();
    endGame();
  } else if (!snakes.some((s) => s.alive)) {
    draw();
    endGame();
  }
}

function tickOnce() {
  if (!running || paused) return;
  const steps = diff === "sim" ? 4 : 1;
  for (let i = 0; i < steps && running; i += 1) step();
}
// #5: ein einziger Spiel-Timer (Start/Pause/Zurück erzeugen nie einen zweiten).
const gameLoop = L.createLoop(tickOnce, () => tickMs, {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (id) => clearTimeout(id),
});

function showOverlay(title, text, button, showSetup, showMenu = false) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startBtn.textContent = button;
  setupEl.classList.toggle("hidden", !showSetup);
  document.getElementById("menu-btn").hidden = !showMenu;
  overlay.classList.remove("hidden");
  syncLeave();
}

function hideOverlay() {
  overlay.classList.add("hidden");
  syncLeave();
}

function reset() {
  tickMs = DIFFS[diff].tick;
  score = 0;
  paused = false;
  scoreEl.textContent = "0";
  input = L.createInput();
  chooseGrid();
  resize();
  snakes = layoutSnakes();
  placeFood();
  renderLegend();
  draw();
}

// Vollbild nur auf dem Handy. Ohne navigationUI:"hide": die Systemleiste bleibt ein zweiter Ausweg.
function tryFullscreen() {
  if (!isPhone() || document.fullscreenElement || document.webkitFullscreenElement) return;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return;
  try {
    const r = req.call(el);
    if (r && r.catch) r.catch(() => {});
  } catch (e) { /* nicht erlaubt: ohne Vollbild weiter */ }
}

function exitFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (!(document.fullscreenElement || document.webkitFullscreenElement) || !exit) return;
  try {
    const r = exit.call(document);
    if (r && r.catch) r.catch(() => {});
  } catch (e) { /* schon draussen */ }
}

function startGame() {
  tryFullscreen();
  gameLoop.stop();
  hideConfirm();
  reset();
  running = true;
  hideOverlay();
  const hint = mode === "swarm"
    ? "Schwarm: 12 KIs. Sim-Tempo läuft sehr schnell."
    : mode === "auto"
    ? "Automatik: 8 KIs. Sim-Tempo für schnelle Simulation."
    : "7 / linke Hälfte, 3 / rechte Hälfte, Pfeile absolut. P pausiert.";
  hintEl.textContent = hint;
  gameLoop.start();
}

function endGame() {
  running = false;
  gameLoop.stop();
  saveHigh();
  const extra = (mode === "arena" || mode === "auto" || mode === "swarm")
    ? ` KI-Punkte: ${snakes.filter((s) => s.kind === "ai").slice(0, 6).map((s) => `${s.name} ${s.points}`).join(", ")}.`
    : "";
  showOverlay("Game Over", `Punkte: ${score}.${extra} Nochmal?`, "Nochmal", true, true);
  startBtn.focus({ preventScroll: true });
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  if (paused) {
    gameLoop.pause();
    showOverlay("Pause", "Tippe auf Weiter.", "Weiter", false, true);
    startBtn.focus({ preventScroll: true });
  } else {
    hideConfirm();
    hideOverlay();
    gameLoop.resume();
  }
}

function saveHigh() {
  if (score > high) {
    high = score;
    highEl.textContent = String(high);
    localStorage.setItem(HIGH_KEY, String(high));
  }
}

// ---------------------------------------------------------------- Zurück zum Startbildschirm (#5)
const INTRO_TEXT = "Kante wrappt zur Gegenseite. Solo, Arena, Automatik oder Schwarm mit vielen KIs.";
const confirmEl = document.getElementById("confirm");
const menuBtn = document.getElementById("menu-btn");
const leaveBtn = document.getElementById("leave");
let resumeOnCancel = false;

function onStartScreen() {
  return !running && !paused && !overlay.classList.contains("hidden") && menuBtn.hidden;
}

function syncLeave() {
  leaveBtn.hidden = onStartScreen();
}

function showStartScreen() {
  hideConfirm();
  hintEl.textContent = HINT_TEXT;
  showOverlay("Snake", INTRO_TEXT, "Start", true, false);
}

function backToMenu() {
  resumeOnCancel = false;
  exitFullscreen();
  saveHigh();             // abgebrochenes Spiel zählt für den Rekord
  running = false;
  paused = false;
  gameLoop.stop();
  reset();                // Länge, Richtung, Puffer, Score zurück
  showStartScreen();
  startBtn.focus({ preventScroll: true });
}

function showConfirm() {
  confirmEl.hidden = false;
  overlay.classList.remove("hidden");
  overlay.classList.add("confirming");
  document.getElementById("confirm-no").focus({ preventScroll: true });
}

function hideConfirm() {
  if (confirmEl.hidden) return;
  confirmEl.hidden = true;
  overlay.classList.remove("confirming");
}

function askLeave() {
  exitFullscreen();
  if (!running) {
    backToMenu();
    return;
  }
  if (!paused) {
    paused = true;
    gameLoop.pause();
    resumeOnCancel = true;
  } else {
    resumeOnCancel = false;
  }
  showConfirm();
}

menuBtn.addEventListener("click", () => {
  resumeOnCancel = false;
  if (running) showConfirm();   // Spiel noch nicht vorbei → Rückfrage
  else backToMenu();            // Game Over → direkt
});
leaveBtn.addEventListener("click", askLeave);
document.getElementById("confirm-yes").addEventListener("click", backToMenu);
document.getElementById("confirm-no").addEventListener("click", () => {
  hideConfirm();
  if (resumeOnCancel) {
    resumeOnCancel = false;
    paused = false;
    hideOverlay();
    gameLoop.resume();
    return;
  }
  menuBtn.focus({ preventScroll: true });
});

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
  const code = event.code || "";
  // #5: Esc = Pause; in der Rückfrage = Nein. Auf Buttons lösen Enter/Leertaste nur den Button aus.
  if (key === "escape") {
    event.preventDefault();
    if (!confirmEl.hidden) document.getElementById("confirm-no").click();
    else if (document.fullscreenElement || document.webkitFullscreenElement) exitFullscreen();
    else if (running && !paused) togglePause();
    return;
  }
  if (!confirmEl.hidden) return;   // Rückfrage offen: keine Spieltasten
  const onButton = event.target && event.target.closest && event.target.closest("button");
  if (onButton && (key === " " || key === "enter")) return;
  if (code === "Numpad7" || code === "Digit7" || key === "7") { event.preventDefault(); nokia("7"); return; }
  if (code === "Numpad3" || code === "Digit3" || key === "3") { event.preventDefault(); nokia("3"); return; }
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

// Touchzonen (#2): linke/rechte Hälfte, sofort bei pointerdown (kein 300-ms-Klick, touch-action: none).
boardWrap.addEventListener("pointerdown", (event) => {
  if (!running || paused || !overlay.classList.contains("hidden")) return;
  event.preventDefault();
  const box = boardWrap.getBoundingClientRect();
  const left = event.clientX - box.left < box.width / 2;
  nokia(left ? "7" : "3");
  feedback(left ? zoneL : zoneR);
});
boardWrap.addEventListener("contextmenu", (event) => event.preventDefault());

// Klickbestätigung (#4): nur am gedrückten Element, LCD-Invert (+1 px eindrücken) für 80 ms.
// Auslösen bei pointerdown, Zurücksetzen per Timer (nicht pointerup), damit Doppeltipps beide sichtbar sind.
const PRESS_MS = 80;
function press(el) {
  clearTimeout(el._pressT);
  el.classList.remove("press");
  void el.offsetWidth;   // Neustart bei schnellem Doppeltipp
  el.classList.add("press");
  el._pressT = setTimeout(() => el.classList.remove("press"), PRESS_MS);
}
function buzz() {
  if (vibe && navigator.vibrate) {
    try { navigator.vibrate(15); } catch (e) { /* nicht unterstützt */ }
  }
}
// Touchzone: nur die schmale Leiste unten auf der getippten Seite.
function feedback(zone) {
  press(zone);
  buzz();
}
document.addEventListener("pointerdown", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;
  press(btn);
  buzz();
});

function setVibe(on) {
  vibe = on;
  localStorage.setItem("snake-html-vibe", on ? "1" : "0");
  vibeBtn.classList.toggle("active", on);
  vibeBtn.setAttribute("aria-pressed", String(on));
  vibeBtn.textContent = on ? "An" : "Aus";
}
vibeBtn.addEventListener("click", () => setVibe(!vibe));
setVibe(vibe);

// App-/Tab-Wechsel (#3): automatisch pausieren, weiter erst mit „Weiter“.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && running && !paused) togglePause();
});

// Drehen: Raster bleibt, Feld wird neu eingepasst; laufendes Spiel pausiert.
function onViewport() {
  const now = innerWidth > innerHeight;
  if (now !== landscape && running && !paused) togglePause();
  landscape = now;
  resize();
}
window.addEventListener("resize", onViewport);
if (window.visualViewport) visualViewport.addEventListener("resize", onViewport);
reset();
resize();
showStartScreen();
