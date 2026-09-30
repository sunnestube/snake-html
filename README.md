# Snake

Klassisches Snake im Browser. Eine Datei fürs Markup, eine fürs Styling, eine für die Spiellogik.

## Spielen

`index.html` im Browser öffnen. Kein Build, keine Abhängigkeiten.

Pfeiltasten oder WASD steuern die Schlange. Leertaste startet und setzt nach einer Pause fort. `P` pausiert. Auf dem Handy geht Wischen über das Spielfeld.

Futter gibt einen Punkt und verlängert die Schlange. Die Runde endet an der Wand oder am eigenen Schwanz. Der Rekord bleibt im `localStorage`.

## Dateien

- `index.html` — Seite und Canvas
- `css/style.css` — Layout
- `js/game.js` — Grid, Bewegung, Kollision, Punkte
