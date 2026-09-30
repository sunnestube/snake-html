# Play-Update 1.2

Google Play verlangt für Updates **targetSdk 36** (Android 16). Dieser Branch setzt das um.

## Einmalig lokal

1. Node 20+, Android SDK Platform 36, Build-Tools 36.0.0, NDK 27.1.12297006.
2. Abhängigkeiten neu installieren, Lockfiles sind noch vom alten Stand:

```bash
npm install
cd ios && pod install && cd ..
```

3. Release-Passwörter nicht ins Git. Datei `android/keystore.properties`:

```
SNAKE_STORE_PASSWORD=...
SNAKE_KEY_PASSWORD=...
```

## Bundle bauen und hochladen

```bash
cd android
./gradlew bundleRelease
```

AAB: `android/app/build/outputs/bundle/release/app-release.aab`

versionCode 12 / versionName 1.2. Hochladen ersetzt die Ziel-API-Warnung, sobald die Version in Prüfung ist. Fristverlängerung in der Play Console läuft bis 1. November 2026.

## Was geändert ist

- React Native 0.81.6, React 19.1.4, Kotlin 2.1.20, Gradle 8.14.3, NDK 27.1 (16-KB-Pages).
- Edge-to-Edge, Safe Area, Predictive Back.
- Spielfeld passt sich an Insets an, Pause bei Hintergrund, Highscore lokal, Selbstkollision.
- Ungenutzte Pakete `react-native-gesture-handler` und `react-native-reanimated` entfernt.
