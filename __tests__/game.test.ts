import { canTurn, randomFood, step, wrap } from '../src/game';

test('wraps coordinates onto the board', () => {
  expect(wrap(-1, 10)).toBe(9);
  expect(wrap(10, 10)).toBe(0);
});

test('blocks an immediate reverse turn', () => {
  expect(canTurn({ x: 1, y: 0 }, { x: -1, y: 0 })).toBe(false);
  expect(canTurn({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(true);
});

test('grows when eating and dies on self collision', () => {
  const snake = [
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 2, y: 1 },
  ];
  const eaten = step(snake, { x: 1, y: 0 }, { x: 2, y: 1 }, 8, 8, () => 0);
  expect(eaten.ate).toBe(true);
  expect(eaten.dead).toBe(true);
  expect(eaten.snake).toHaveLength(5);
});

test('places food on a free cell', () => {
  const food = randomFood(2, 1, [{ x: 0, y: 0 }], () => 0);
  expect(food).toEqual({ x: 1, y: 0 });
});
