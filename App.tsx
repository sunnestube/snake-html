import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { canTurn, Dir, Point, randomFood, step } from './src/game';

const TICK_MS = 150;
const HIGH_SCORE_KEY = 'snake.highScore';

function SnakeGame(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [cols, setCols] = useState(12);
  const [rows, setRows] = useState(18);
  const [cell, setCell] = useState(20);
  const [snake, setSnake] = useState<Point[]>([{ x: 2, y: 2 }]);
  const [food, setFood] = useState<Point>({ x: 6, y: 6 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [alive, setAlive] = useState(true);
  const [paused, setPaused] = useState(false);

  const dirRef = useRef<Dir>({ x: 1, y: 0 });
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const aliveRef = useRef(alive);
  const pausedRef = useRef(paused);
  const colsRef = useRef(cols);
  const rowsRef = useRef(rows);
  const scoreRef = useRef(score);
  const highScoreRef = useRef(highScore);

  snakeRef.current = snake;
  foodRef.current = food;
  aliveRef.current = alive;
  pausedRef.current = paused;
  colsRef.current = cols;
  rowsRef.current = rows;
  scoreRef.current = score;
  highScoreRef.current = highScore;

  useEffect(() => {
    AsyncStorage.getItem(HIGH_SCORE_KEY)
      .then(value => {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) {
          setHighScore(parsed);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      setPaused(state !== 'active');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!aliveRef.current || pausedRef.current) {
        return;
      }
      const result = step(
        snakeRef.current,
        dirRef.current,
        foodRef.current,
        colsRef.current,
        rowsRef.current,
      );
      setSnake(result.snake);
      setFood(result.food);
      if (result.ate) {
        const nextScore = scoreRef.current + 1;
        setScore(nextScore);
        if (nextScore > highScoreRef.current) {
          setHighScore(nextScore);
          AsyncStorage.setItem(HIGH_SCORE_KEY, String(nextScore)).catch(() => undefined);
        }
      }
      if (result.dead) {
        setAlive(false);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const turn = (next: Dir) => {
    if (alive && canTurn(dirRef.current, next)) {
      dirRef.current = next;
    }
  };

  const restart = () => {
    const start = [{ x: 2, y: 2 }];
    dirRef.current = { x: 1, y: 0 };
    setSnake(start);
    setFood(randomFood(cols, rows, start));
    setScore(0);
    setAlive(true);
    setPaused(false);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.score}>Punkte {score}</Text>
        <Text style={styles.score}>Best {highScore}</Text>
        <Pressable onPress={() => setPaused(value => !value)} style={styles.smallButton}>
          <Text style={styles.buttonText}>{paused ? 'Weiter' : 'Pause'}</Text>
        </Pressable>
      </View>

      <View
        style={styles.board}
        onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          const nextCell = Math.max(12, Math.floor(Math.min(width, height) / 18));
          const nextCols = Math.max(8, Math.floor(width / nextCell));
          const nextRows = Math.max(8, Math.floor(height / nextCell));
          setCell(nextCell);
          setCols(nextCols);
          setRows(nextRows);
        }}>
        <View style={{ width: cols * cell, height: rows * cell }}>
          {snake.map((part, index) => (
            <View
              key={`${part.x}-${part.y}-${index}`}
              style={[
                styles.segment,
                {
                  width: cell - 1,
                  height: cell - 1,
                  left: part.x * cell,
                  top: part.y * cell,
                  backgroundColor: index === 0 ? '#7CFF6B' : '#2E8B57',
                },
              ]}
            />
          ))}
          <View
            style={[
              styles.segment,
              {
                width: cell - 1,
                height: cell - 1,
                left: food.x * cell,
                top: food.y * cell,
                backgroundColor: '#FF4D4D',
              },
            ]}
          />
          {!alive && (
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>Game over</Text>
              <Pressable onPress={restart} style={styles.smallButton}>
                <Text style={styles.buttonText}>Nochmal</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable onPress={() => turn({ x: 0, y: -1 })} style={styles.pad}>
          <Text style={styles.buttonText}>↑</Text>
        </Pressable>
        <View style={styles.row}>
          <Pressable onPress={() => turn({ x: -1, y: 0 })} style={styles.pad}>
            <Text style={styles.buttonText}>←</Text>
          </Pressable>
          <Pressable onPress={() => turn({ x: 1, y: 0 })} style={styles.pad}>
            <Text style={styles.buttonText}>→</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => turn({ x: 0, y: 1 })} style={styles.pad}>
          <Text style={styles.buttonText}>↓</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <SnakeGame />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050805',
  },
  hud: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  score: {
    color: '#F4F4F4',
    fontSize: 16,
    fontWeight: '600',
  },
  board: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayTitle: {
    color: 'white',
    fontSize: 28,
    marginBottom: 12,
    fontWeight: '700',
  },
  controls: {
    alignItems: 'center',
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
  },
  pad: {
    width: 64,
    height: 64,
    margin: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#243024',
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#243024',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
  },
});
