# SudokuOne

A polished, browser-based Sudoku game with no dependencies and no build step. Just open `index.html` and play.

![Sudoku game screenshot showing a medium difficulty puzzle with dark theme](screenshot.png)

## Features

- **4 difficulty levels** — Easy, Medium, Hard, and Expert (controlled by the number of revealed clues)
- **Live puzzle fetching** — puzzles are pulled from the [Dosuku API](https://sudoku-api.vercel.app/) so every game is unique; falls back to built-in puzzles when offline
- **Pencil notes** — toggle Notes mode to mark candidate numbers in cells
- **Auto notes** — one click fills every blank cell with all valid candidates
- **Hint** — reveals the correct value for one empty cell
- **Undo** — step back through your moves one at a time
- **Error highlighting** — wrong entries turn red and shake; a running error count is shown
- **Cell highlighting** — selecting a cell highlights its row, column, and 3×3 box, plus all matching numbers on the board
- **Keyboard support** — arrow keys to navigate, 1–9 to enter numbers, Backspace/Delete to erase, P to toggle pencil mode, Ctrl+Z to undo
- **Timer** — counts up per game; pauses automatically when you switch tabs
- **Stats tracking** — every game (completed or abandoned) is recorded in `localStorage` with time, errors, and hints used
- **Stats view** — overall totals plus a per-difficulty breakdown and a recent-games list
- **Win screen** — confetti animation and a summary card on completion
- **Dark theme** — deep navy palette with pink, purple, and cyan accents

## Running Locally

No installation required. Serve the directory with any static file server, for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

Alternatively, most modern browsers will run ES modules directly from `file://`, so you can simply open `index.html` from your file manager.

## Project Structure

```
SudokuOne/
├── index.html        # App shell and markup
├── style.css         # All styles, animations, and responsive layout
└── js/
    ├── app.js        # Entry point — owns all state, wires modules together
    ├── puzzle.js     # Core game logic (no DOM)
    ├── timer.js      # Timer with Page Visibility API pause/resume
    ├── stats.js      # localStorage read/write and aggregate stat computation
    ├── ui.js         # All DOM rendering and event binding
    └── api.js        # Dosuku API fetch with offline fallback
```

## Tech

- Vanilla HTML, CSS, and JavaScript — no frameworks, no bundler
- ES modules (`<script type="module">`) for clean imports without a build step
- `localStorage` for persistent stats across sessions
- [Dosuku API](https://sudoku-api.vercel.app/) for puzzle generation

## Difficulty

Puzzles are fetched as fully solved grids. Difficulty is applied client-side by removing cells down to a target clue count:

| Level  | Clues |
|--------|-------|
| Easy   | 38    |
| Medium | 29    |
| Hard   | 24    |
| Expert | 18    |

## Hosting on GitHub Pages

After pushing to GitHub, go to **Settings → Pages**, set the source to the `main` branch and `/ (root)` folder, and save. Your game will be live at `https://YOUR_USERNAME.github.io/SudokuOne/` within a minute or two.
