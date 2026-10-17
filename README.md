# Snake

Klassisches Snake im Browser, responsive für Handy und Desktop.

## Regeln

Über den Rand läuft die Schlange auf der Gegenseite weiter. Tod nur durch Kollision mit sich selbst oder einer anderen Schlange. Futter gibt einen Punkt.

## Modi

- **Solo** — nur du
- **Arena** — du gegen mehrere KIs
- **Automatik** — 8 KIs mit unterschiedlichen Skills
- **Schwarm** — 12 KIs für dichtere Simulation

Tempo: Leicht, Normal, Schwer, Turbo, **Sim** (sehr schnell, 4 Steps pro Frame, reduziertes Drawing).

## Bedienung

- PC: `7` und `3` (Ziffern oder Numpad) wie beim Nokia: bei waagrechter Bewegung `3` = hoch, `7` = runter; bei senkrechter `3` = rechts, `7` = links. Pfeiltasten/WASD setzen die Richtung absolut (180°-Umkehr wird ignoriert). Leertaste startet, P pausiert
- Handy: Vollbild, rechte Bildschirmhälfte = `3`, linke = `7`
- Eingaben werden gepuffert (max. 2 pro Tick, eine pro Tick angewendet); die Achse der nächsten Eingabe kommt aus der zuletzt gepufferten Richtung

`index.html` im Browser öffnen. Kein Build. Automatisch auf Vercel deployed.

## Wachstum und Ausscheiden

Jedes Futter macht eine Schlange dauerhaft um ein Segment länger (`body.length === 3 + Punkte`). Wer mit Körper oder Kopf an Kopf kollidiert, scheidet aus und steht in der Legende durchgestrichen mit „✝ Länge“. Einen Respawn gibt es nicht mehr. Die Tick-Logik liegt DOM-frei in `js/logic.js`.

KI: Sie wählt keinen sofort tödlichen Zug und meidet Sackgassen mit einem Flood-Fill. Gezählt wird nur Platz, den sie vor anderen Köpfen erreicht, und er muss mindestens so gross sein wie die eigene Länge. Felder, die ein anderer Kopf im selben Tick erreichen kann, meidet sie, wenn es eine Alternative gibt. Futter jagt sie nur über Züge, die diese Prüfungen bestehen.

Futter: In Solo liegt immer 1 Futter, sonst max(1, ceil(lebende/2)) gleichzeitig. Sind 35 % des Felds mit Schlangen belegt (ausgeschiedene zählen mit), kommt kein neues Futter mehr dazu. Sonst läuft das Feld voll und am Ende sterben alle.

Look (#3): Retro-LCD, Pixel-Font VT323 (OFL, `fonts/`), scharfes Canvas, Auto-Pause bei App-Wechsel, Vibration im Startscreen abschaltbar.

Tests: `node tests/input.test.mjs` (Steuerung/Puffer) und `node tests/growth.test.mjs` (dauert rund 3–4 Minuten wegen 6 Schwarm-Simulationen über je 60 s Sim-Tempo = 12000 Ticks)

## PWA und Android-App (#6)

Die Web-Version ist eine PWA: `manifest.webmanifest` (Vollbild, `orientation: any`, Icons 192/512 und maskable aus dem alten App-Logo), `sw.js` cacht alle Assets inklusive der VT323-Schrift, danach läuft das Spiel offline. Neue Version des Service Workers: `CACHE` in `sw.js` hochzählen.

Die Android-App ist eine Trusted Web Activity (Bubblewrap) in `android-twa/` und ersetzt im Play Store die App aus `sunnestube/snake` als Update:

- `applicationId` `li.jueni.snakegame`, `versionCode` 13 (alte App: 12), `versionName` 2.0, `targetSdk` 36, `minSdk` 24
- Host `snake-html-eight.vercel.app`, Digital Asset Links unter `/.well-known/assetlinks.json`
- Datenschutzerklärung: https://gitlab.com/Jueni/datenschutz/-/raw/main/README.md (Link auch im Startbildschirm)

### AAB bauen

Voraussetzungen: JDK 17 oder 21, Android SDK mit `platforms;android-36` und `build-tools;36.0.0` (`ANDROID_HOME` gesetzt).

```sh
cd android-twa
export SNAKE_SIGNING_PROPERTIES=/workspace/secrets/snake-upload.properties   # Datei ausserhalb des Repos
./gradlew --no-daemon bundleRelease
# Ergebnis: app/build/outputs/bundle/release/app-release.aab
```

Die Properties-Datei enthält `storeFile`, `keyAlias`, `storePassword` und `keyPassword`. In GitHub Actions stattdessen die Secrets als Umgebungsvariablen `SNAKE_STORE_FILE`, `SNAKE_KEY_ALIAS`, `SNAKE_STORE_PASSWORD` und `SNAKE_KEY_PASSWORD` setzen. Keystores, Passwörter, AAB und APK sind in `.gitignore` und gehören nie ins Repo.

Bei jedem Store-Update `versionCode` in `android-twa/app/build.gradle` und `android-twa/twa-manifest.json` erhöhen. Wenn Google Play die App mit Play App Signing signiert, gehört auch der SHA-256 des App-Signaturschlüssels aus der Play Console (Einstellungen → App-Integrität) in `.well-known/assetlinks.json`, sonst zeigt die installierte App eine Browser-Leiste.
