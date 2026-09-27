import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';

const { width, height } = Dimensions.get('window');
const boxSize = 20;

interface Segment {
    x: number;
    y: number;
}

const generateFood = (): Segment => {
    const x = Math.floor(Math.random() * (width / boxSize)) * boxSize;
    const y = Math.floor(Math.random() * (height / boxSize)) * boxSize;
    return { x, y };
};

const SnakeGame: React.FC = () => {
    const [snake, setSnake] = useState<Segment[]>([{ x: 0, y: 0 }]);
    const [food, setFood] = useState<Segment>(generateFood());
    const [direction, setDirection] = useState<{ x: number; y: number }>({ x: 1, y: 0 });

    useEffect(() => {
        const moveSnake = () => {
            const newSnake = [...snake];
            const head: Segment = { x: newSnake[0].x + direction.x * boxSize, y: newSnake[0].y + direction.y * boxSize };

            // Überprüfen, ob die Schlange das Essen erreicht hat
            if (head.x === food.x && head.y === food.y) {
                newSnake.unshift(head); // Füge den neuen Kopf hinzu
                setFood(generateFood()); // Generiere neues Essen
            } else {
                newSnake.pop(); // Entferne das letzte Segment
                newSnake.unshift(head); // Füge den neuen Kopf hinzu
            }

            setSnake(newSnake);
        };

        const interval = setInterval(moveSnake, 200);
        return () => clearInterval(interval);
    }, [snake, direction, food]);

    const changeDirection = (newDirection: { x: number; y: number }) => {
        setDirection(newDirection);
    };

    return (
        <TouchableWithoutFeedback onPress={() => changeDirection({ x: 0, y: -1 })}>
            <View style={styles.container}>
                {snake.map((segment, index) => (
                    <View key={index} style={[styles.snakeSegment, { left: segment.x, top: segment.y }]} />
                ))}
                <View style={[styles.food, { left: food.x, top: food.y }]} />
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
    },
    snakeSegment: {
        position: 'absolute',
        width: boxSize,
        height: boxSize,
        backgroundColor: 'green',
    },
    food: {
        position: 'absolute',
        width: boxSize,
        height: boxSize,
        backgroundColor: 'red',
    },
});

export default SnakeGame;
