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

Tests: `node tests/input.test.mjs` (Steuerung/Puffer) und `node tests/growth.test.mjs` (dauert rund 3–4 Minuten wegen 6 Schwarm-Simulationen über je 60 s Sim-Tempo = 12000 Ticks)
