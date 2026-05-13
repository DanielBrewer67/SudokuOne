const DOSUKU_URL = 'https://sudoku-api.vercel.app/api/dosuku';
const DOSUKU_QUERY = '{newboard(limit:1){grids{value,solution,difficulty}}}';
const API_TIMEOUT_MS = 8000;

export async function fetchPuzzle() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch(DOSUKU_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: DOSUKU_QUERY }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Server returned ${response.status}`);

    const data = await response.json();
    const grid = data?.newboard?.grids?.[0];

    if (!grid || !validateGrid(grid.solution)) throw new Error('Invalid puzzle data received');

    return {
      value: grid.value,
      solution: grid.solution,
      difficulty: grid.difficulty,
    };
  } catch {
    return getLocalFallbackPuzzle();
  }
}

function validateGrid(solution) {
  if (!Array.isArray(solution) || solution.length !== 9) return false;
  for (const row of solution) {
    if (!Array.isArray(row) || row.length !== 9) return false;
    for (const v of row) {
      if (typeof v !== 'number' || v < 1 || v > 9) return false;
    }
  }
  return true;
}

// Pre-validated Sudoku solutions used when the API is unreachable.
const FALLBACK_SOLUTIONS = [
  // Classic Wikipedia example
  [
    [5,3,4,6,7,8,9,1,2],
    [6,7,2,1,9,5,3,4,8],
    [1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3],
    [4,2,6,8,5,3,7,9,1],
    [7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4],
    [2,8,7,4,1,9,6,3,5],
    [3,4,5,2,8,6,1,7,9],
  ],
  [
    [1,2,3,4,5,6,7,8,9],
    [4,5,6,7,8,9,1,2,3],
    [7,8,9,1,2,3,4,5,6],
    [2,1,4,3,6,5,8,9,7],
    [3,6,5,8,9,7,2,1,4],
    [8,9,7,2,1,4,3,6,5],
    [5,3,1,6,4,2,9,7,8],
    [6,4,2,9,7,8,5,3,1],
    [9,7,8,5,3,1,6,4,2],
  ],
  [
    [8,1,2,7,5,3,6,4,9],
    [9,4,3,6,8,2,1,7,5],
    [6,7,5,4,9,1,2,8,3],
    [1,5,4,2,3,7,8,9,6],
    [3,6,9,8,4,5,7,2,1],
    [2,8,7,1,6,9,5,3,4],
    [5,2,1,9,7,4,3,6,8],
    [4,3,8,5,2,6,9,1,7],
    [7,9,6,3,1,8,4,5,2],
  ],
  [
    [2,9,5,7,4,3,8,6,1],
    [4,3,1,8,6,5,9,2,7],
    [8,7,6,1,9,2,5,4,3],
    [3,8,7,4,5,9,2,1,6],
    [6,1,2,3,8,7,4,9,5],
    [5,4,9,2,1,6,7,3,8],
    [7,6,3,5,2,4,1,8,9],
    [9,2,8,6,7,1,3,5,4],
    [1,5,4,9,3,8,6,7,2],
  ],
];

function getLocalFallbackPuzzle() {
  const solution = FALLBACK_SOLUTIONS[Math.floor(Math.random() * FALLBACK_SOLUTIONS.length)];
  const empty = Array(9).fill(null).map(() => Array(9).fill(0));
  return { value: empty, solution, difficulty: 'Medium' };
}
