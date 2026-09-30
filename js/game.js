const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highEl = document.getElementById("high");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startBtn = document.getElementById("start");

const TILE = 20;
const COLS = canvas.width / TILE;
const ROWS = canvas.height / TILE;
const HIGH_KEY = "snake-html-high";

let snake;
let dir;
let nextDir;
let food;
let score;
let high = Number(localStorage.getItem(HIGH_KEY) || 0);
let running = false;
let paused = false;
let loopId = null;
let tickMs = 140;
let touchStart = null;

highEl.textContent = high;

function reset() {
  snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  tickMs = 140;
  paused = false;
  scoreEl.textContent = "0";
  placeFood();
  draw();
}

function placeFood() {
  const free = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (!snake.some((part) => part.x === x && part.y === y)) {
        free.push({ x, y });
      }
    }
  }
  food = free[Math.floor(Math.random() * free.length)];
}

function setDirection(x, y) {
  if (x === -dir.x && y === -dir.y) return;
  nextDir = { x, y };
}

function step() {
  dir = nextDir;
  const head = {
    x: snake[0].x + dir.x,
    y: snake[0].y + dir.y,
  };

  const hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
  const hitSelf = snake.some((part) => part.x === head.x && part.y === head.y);
  if (hitWall || hitSelf) {
    endGame();
    return;
  }

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 1;
    scoreEl.textContent = String(score);
    if (score > high) {
      high = score;
      highEl.textContent = String(high);
      localStorage.setItem(HIGH_KEY, String(high));
    }
    if (tickMs > 70) tickMs -= 4;
    placeFood();
  } else {
    snake.pop();
  }
  draw();
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#1c261e";
  ctx.lineWidth = 1;
  for (let i = 1; i < COLS; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * TILE, 0);
    ctx.lineTo(i * TILE, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * TILE);
    ctx.lineTo(canvas.width, i * TILE);
    ctx.stroke();
  }

  drawCell(food.x, food.y, "#e85d4c");
  snake.forEach((part, index) => {
    drawCell(part.x, part.y, index === 0 ? "#c6f5b8" : "#7dce6a");
  });
}

function loop() {
  if (!running || paused) return;
  step();
  if (running) loopId = setTimeout(loop, tickMs);
}

function showOverlay(title, text, button) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startBtn.textContent = button;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function startGame() {
  clearTimeout(loopId);
  reset();
  running = true;
  hideOverlay();
  loop();
}

function endGame() {
  running = false;
  clearTimeout(loopId);
  showOverlay(
    "Game Over",
    `Punkte: ${score}. Leertaste oder Button für eine neue Runde.`,
    "Nochmal"
  );
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  if (paused) {
    clearTimeout(loopId);
    showOverlay("Pause", "P oder Leertaste setzt fort.", "Weiter");
  } else {
    hideOverlay();
    loop();
  }
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const arrows = ["arrowup", "arrowdown", "arrowleft", "arrowright", " "];
  if (arrows.includes(key) || ["w", "a", "s", "d", "p"].includes(key)) {
    event.preventDefault();
  }

  if (key === "arrowup" || key === "w") setDirection(0, -1);
  if (key === "arrowdown" || key === "s") setDirection(0, 1);
  if (key === "arrowleft" || key === "a") setDirection(-1, 0);
  if (key === "arrowright" || key === "d") setDirection(1, 0);

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

canvas.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });

canvas.addEventListener("touchend", (event) => {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
  if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 1 : -1, 0);
  else setDirection(0, dy > 0 ? 1 : -1);
  touchStart = null;
}, { passive: true });

reset();
showOverlay("Snake", "Pfeiltasten oder WASD. Leertaste startet.", "Start");
