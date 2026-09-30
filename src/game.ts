export type Point = { x: number; y: number };
export type Dir = { x: number; y: number };

export function canTurn(current: Dir, next: Dir): boolean {
  return current.x + next.x !== 0 || current.y + next.y !== 0;
}

export function wrap(value: number, size: number): number {
  if (size <= 0) {
    return 0;
  }
  return ((value % size) + size) % size;
}

export function randomFood(cols: number, rows: number, snake: Point[], random = Math.random): Point {
  const free: Point[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (!snake.some(part => part.x === x && part.y === y)) {
        free.push({ x, y });
      }
    }
  }
  if (free.length === 0) {
    return { x: 0, y: 0 };
  }
  return free[Math.floor(random() * free.length)];
}

export function step(
  snake: Point[],
  dir: Dir,
  food: Point,
  cols: number,
  rows: number,
  random = Math.random,
): { snake: Point[]; food: Point; ate: boolean; dead: boolean } {
  if (snake.length === 0 || cols <= 0 || rows <= 0) {
    return { snake, food, ate: false, dead: true };
  }

  const head = snake[0];
  const next = {
    x: wrap(head.x + dir.x, cols),
    y: wrap(head.y + dir.y, rows),
  };
  const ate = next.x === food.x && next.y === food.y;
  const body = ate ? snake : snake.slice(0, -1);
  const dead = body.some(part => part.x === next.x && part.y === next.y);
  const nextSnake = [next, ...body];

  return {
    snake: nextSnake,
    food: ate ? randomFood(cols, rows, nextSnake, random) : food,
    ate,
    dead,
  };
}
