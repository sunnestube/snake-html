import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableWithoutFeedback, Text } from 'react-native';

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

const App: React.FC = () => {
    const [snake, setSnake] = useState<Segment[]>([{ x: 0, y: 0 }]);
    const [food, setFood] = useState<Segment>(generateFood());
    const [direction, setDirection] = useState<{ x: number; y: number }>({ x: 1, y: 0 });

    useEffect(() => {
        const moveSnake = () => {
            const newSnake = [...snake];
            const head: Segment = {
                x: newSnake[0].x + direction.x * boxSize,
                y: newSnake[0].y + direction.y * boxSize,
            };

            // Überprüfen, ob die Schlange das Essen erreicht hat
            if (Math.abs(head.x - food.x) < boxSize && Math.abs(head.y - food.y) < boxSize) {
                newSnake.unshift(head); // Füge den neuen Kopf hinzu
                setFood(generateFood()); // Generiere neues Essen
            } else {
                newSnake.pop(); // Entferne das letzte Segment
                newSnake.unshift(head); // Füge den neuen Kopf hinzu
            }

            // Bildschirmgrenzen überprüfen und die Schlange wrap-around
            if (head.x >= width) {
                head.x = 0; // Wenn die Schlange rechts den Bildschirm verlässt, erscheint sie links
            } else if (head.x < 0) {
                head.x = width - boxSize; // Wenn die Schlange links den Bildschirm verlässt, erscheint sie rechts
            }

            if (head.y >= height) {
                head.y = 0; // Wenn die Schlange unten den Bildschirm verlässt, erscheint sie oben
            } else if (head.y < 0) {
                head.y = height - boxSize; // Wenn die Schlange oben den Bildschirm verlässt, erscheint sie unten
            }

            setSnake(newSnake);
        };

        const interval = setInterval(moveSnake, 200);
        return () => clearInterval(interval);
    }, [direction, snake]); // Füge snake als Abhängigkeit hinzu

    const changeDirection = (newDirection: { x: number; y: number }) => {
        // Verhindere, dass die Schlange sich direkt umdreht
        if (direction.x + newDirection.x !== 0 || direction.y + newDirection.y !== 0) {
            setDirection(newDirection);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.controls}>
                <TouchableWithoutFeedback onPress={() => changeDirection({ x: 0, y: -1 })}>
                    <View style={styles.button}>
                        <Text style={styles.buttonText}>↑</Text>
                    </View>
                </TouchableWithoutFeedback>
                <View style={styles.row}>
                    <TouchableWithoutFeedback onPress={() => changeDirection({ x: -1, y: 0 })}>
                        <View style={styles.button}>
                            <Text style={styles.buttonText}>←</Text>
                        </View>
                    </TouchableWithoutFeedback>
                    <TouchableWithoutFeedback onPress={() => changeDirection({ x: 1, y: 0 })}>
                        <View style={styles.button}>
                            <Text style={styles.buttonText}>→</Text>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
                <TouchableWithoutFeedback onPress={() => changeDirection({ x: 0, y: 1 })}>
                    <View style={styles.button}>
                        <Text style={styles.buttonText}>↓</Text>
                    </View>
                </TouchableWithoutFeedback>
            </View>
            {snake.map((segment, index) => (
                <View key={index} style={[styles.snakeSegment, { left: segment.x, top: segment.y }]} />
            ))}
            <View style={[styles.food, { left: food.x, top: food.y }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controls: {
        position: 'absolute',
        bottom: 50, // Positioniere die Steuerung am unteren Rand
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
    },
    button: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'gray',
        margin: 5,
        borderRadius: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 24,
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

export default App;
