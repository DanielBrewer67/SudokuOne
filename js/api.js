const INDEX_PATH = 'data/puzzle-index.json';
const CSV_PATH   = 'data/sudoku-3m.csv';
const ROW_FETCH_BYTES = 220;   // max row length is ~180 bytes; pad for safety

const DIFFICULTY_MAP = {
  easy:   'easy',
  medium: 'medium',
  hard:   'hard',
  expert: 'expert',
};

let indexCache = null;

async function loadIndex() {
  if (indexCache) return indexCache;
  const res = await fetch(INDEX_PATH);
  if (!res.ok) throw new Error(`Could not load puzzle index (${res.status})`);
  indexCache = await res.json();
  return indexCache;
}

export async function fetchPuzzle(difficulty = 'medium') {
  try {
    const index  = await loadIndex();
    const band   = DIFFICULTY_MAP[difficulty] ?? 'medium';
    const offsets = index.difficulties[band];

    if (!offsets || offsets.length === 0) throw new Error(`No puzzles for difficulty: ${band}`);

    // Pick a random offset and fetch just that one row
    const offset = offsets[Math.floor(Math.random() * offsets.length)];
    const res = await fetch(CSV_PATH, {
      headers: { Range: `bytes=${offset}-${offset + ROW_FETCH_BYTES - 1}` },
    });

    if (!res.ok && res.status !== 206) throw new Error(`Range fetch failed (${res.status})`);

    const text = await res.text();
    // The chunk may start mid-row if the offset is imprecise — take the first complete line
    const line = text.split('\n').find(l => l.trim().length > 0) ?? '';
    return parseRow(line);
  } catch {
    return getLocalFallbackPuzzle();
  }
}

function parseRow(line) {
  const parts = line.trim().split(',');
  if (parts.length < 5) throw new Error('Malformed CSV row');

  const puzzleStr   = parts[1];
  const solutionStr = parts[2];

  if (puzzleStr.length !== 81 || solutionStr.length !== 81) {
    throw new Error('Invalid puzzle length in CSV row');
  }

  // Convert flat strings to 9×9 arrays.
  // puzzle: '.' → 0, digit → that digit
  // solution: digit → that digit
  const value    = [];
  const solution = [];
  for (let r = 0; r < 9; r++) {
    const vRow = [], sRow = [];
    for (let c = 0; c < 9; c++) {
      const i = r * 9 + c;
      vRow.push(puzzleStr[i] === '.' ? 0 : parseInt(puzzleStr[i], 10));
      sRow.push(parseInt(solutionStr[i], 10));
    }
    value.push(vRow);
    solution.push(sRow);
  }

  return { value, solution, difficulty: parts[4]?.trim() ?? '' };
}

// Built-in fallback puzzles — used if the CSV or index cannot be fetched.
const FALLBACK_SOLUTIONS = [
  [
    [5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9],
  ],
  [
    [1,2,3,4,5,6,7,8,9],[4,5,6,7,8,9,1,2,3],[7,8,9,1,2,3,4,5,6],
    [2,1,4,3,6,5,8,9,7],[3,6,5,8,9,7,2,1,4],[8,9,7,2,1,4,3,6,5],
    [5,3,1,6,4,2,9,7,8],[6,4,2,9,7,8,5,3,1],[9,7,8,5,3,1,6,4,2],
  ],
  [
    [8,1,2,7,5,3,6,4,9],[9,4,3,6,8,2,1,7,5],[6,7,5,4,9,1,2,8,3],
    [1,5,4,2,3,7,8,9,6],[3,6,9,8,4,5,7,2,1],[2,8,7,1,6,9,5,3,4],
    [5,2,1,9,7,4,3,6,8],[4,3,8,5,2,6,9,1,7],[7,9,6,3,1,8,4,5,2],
  ],
  [
    [2,9,5,7,4,3,8,6,1],[4,3,1,8,6,5,9,2,7],[8,7,6,1,9,2,5,4,3],
    [3,8,7,4,5,9,2,1,6],[6,1,2,3,8,7,4,9,5],[5,4,9,2,1,6,7,3,8],
    [7,6,3,5,2,4,1,8,9],[9,2,8,6,7,1,3,5,4],[1,5,4,9,3,8,6,7,2],
  ],
];

function getLocalFallbackPuzzle() {
  const solution = FALLBACK_SOLUTIONS[Math.floor(Math.random() * FALLBACK_SOLUTIONS.length)];
  const empty = Array(9).fill(null).map(() => Array(9).fill(0));
  return { value: empty, solution, difficulty: '' };
}
