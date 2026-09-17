# Snake II — Nokia 3310 homage

A single-page, dependency-free Snake game styled after the classic Nokia
3310 "Snake II": a chunky monochrome LCD screen inside a pixel-art phone
shell, complete with a bezel, speaker dots, and an on-screen keypad.

**Play it live:** https://piratekinginc.github.io/test-m1/

## Controls

- **Desktop:** Arrow keys or `WASD` to steer. Space / Enter to
  start or restart.
- **Mobile:** Swipe up/down/left/right on the screen to steer, or tap the
  on-screen keypad. Tap anywhere to start or restart.
- A direct 180° reversal (e.g. Left while moving Right) is ignored, just
  like the original.

The page locks pinch-zoom and scroll while you're on it, so it behaves
like a fixed-size handheld screen on phones too.

## How it's built

- `index.html` — page structure and the phone/LCD shell.
- `style.css` — all visuals (no external fonts, images, or frameworks).
- `js/game-logic.js` — pure, dependency-free game simulation (grid
  movement, collisions, food spawning, scoring). No DOM code lives here,
  which is what makes it unit-testable from Node.
- `js/main.js` — canvas rendering, the game loop, keyboard/touch/keypad
  input, and localStorage high-score persistence. It's a thin layer on
  top of `game-logic.js`.

No build step, no package manager, no dependencies — just open
`index.html` in a browser.

## Running the tests

The core simulation is covered by a headless Node test script (no test
framework, no dependencies):

```sh
node tests/game-logic.test.js
```

It asserts:

- the snake grows and the score increments on eating food
- a non-eating move leaves length/score unchanged
- hitting a wall ends the game
- hitting its own body ends the game
- food is never spawned on a cell occupied by the snake (checked across
  hundreds of randomized trials, plus an exhaustive single-free-cell case)
- a direct 180° reversal is rejected (but allowed for a length-1 snake)
- a freshly created game starts in a valid, in-bounds state

All 9 tests currently pass.

## Deployment

Served as a static site straight from the `main` branch root via GitHub
Pages — no build/publish step required.
