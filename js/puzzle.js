// Core game logic — no DOM dependencies

export function flatten(grid2d) {
  return grid2d.flat();
}

export function getRow(index) { return Math.floor(index / 9); }
export function getCol(index) { return index % 9; }
export function getBox(index) { return Math.floor(getRow(index) / 3) * 3 + Math.floor(getCol(index) / 3); }

export function sharesUnit(a, b) {
  return getRow(a) === getRow(b) || getCol(a) === getCol(b) || getBox(a) === getBox(b);
}

export function getRelatedIndices(index) {
  const result = [];
  for (let i = 0; i < 81; i++) {
    if (i !== index && sharesUnit(i, index)) result.push(i);
  }
  return result;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createPuzzle(rawPuzzle, difficulty) {
  const solution = flatten(rawPuzzle.solution);
  const valueFlat = flatten(rawPuzzle.value);

  // If the CSV provided an actual puzzle (some cells non-zero), use it directly.
  // Otherwise fall back to random cell removal (used by the old API + offline fallback).
  let given;
  if (valueFlat.some(v => v !== 0)) {
    given = valueFlat;
  } else {
    const GIVEN_COUNTS = { easy: 38, medium: 29, hard: 24, expert: 18 };
    const cellsToRemove = 81 - (GIVEN_COUNTS[difficulty] ?? 29);
    const indices = shuffle([...Array(81).keys()]);
    given = [...solution];
    let removed = 0;
    for (const idx of indices) {
      if (removed >= cellsToRemove) break;
      given[idx] = 0;
      removed++;
    }
  }

  return {
    solution,
    given,
    board: [...given],
    notes: Array.from({ length: 81 }, () => new Set()),
    errors: Array(81).fill(false),
    difficulty,
    errorCount: 0,
    hintsUsed: 0,
    history: [],
  };
}

export function isCellEditable(state, cellIndex) {
  return state.given[cellIndex] === 0;
}

export function applyMove(state, cellIndex, value) {
  if (!isCellEditable(state, cellIndex)) return state;

  const prevValue = state.board[cellIndex];
  if (prevValue === value) {
    // Toggle off — treat as erase
    return eraseCell(state, cellIndex);
  }

  const newBoard = [...state.board];
  newBoard[cellIndex] = value;

  const isError = value !== 0 && value !== state.solution[cellIndex];
  const newErrors = [...state.errors];
  newErrors[cellIndex] = isError;

  // Clear notes in same row/col/box that contain this value
  const newNotes = state.notes.map((s, i) => {
    if (i === cellIndex) return new Set();
    if (!sharesUnit(i, cellIndex)) return s;
    if (!s.has(value)) return s;
    const copy = new Set(s);
    copy.delete(value);
    return copy;
  });

  const history = [
    ...state.history,
    { cellIndex, prevValue, prevNotes: new Set(state.notes[cellIndex]), action: 'place' },
  ];

  return {
    ...state,
    board: newBoard,
    notes: newNotes,
    errors: newErrors,
    errorCount: state.errorCount + (isError ? 1 : 0),
    history,
  };
}

export function applyNote(state, cellIndex, noteValue) {
  if (!isCellEditable(state, cellIndex)) return state;
  if (state.board[cellIndex] !== 0) return state;

  const prevNotes = new Set(state.notes[cellIndex]);
  const newNoteSet = new Set(prevNotes);
  if (newNoteSet.has(noteValue)) {
    newNoteSet.delete(noteValue);
  } else {
    newNoteSet.add(noteValue);
  }

  const newNotes = state.notes.map((s, i) => (i === cellIndex ? newNoteSet : s));
  const history = [
    ...state.history,
    { cellIndex, prevValue: state.board[cellIndex], prevNotes, action: 'note' },
  ];

  return { ...state, notes: newNotes, history };
}

export function eraseCell(state, cellIndex) {
  if (!isCellEditable(state, cellIndex)) return state;

  const prevValue = state.board[cellIndex];
  const prevNotes = new Set(state.notes[cellIndex]);

  if (prevValue === 0 && prevNotes.size === 0) return state;

  const newBoard = [...state.board];
  newBoard[cellIndex] = 0;

  const newErrors = [...state.errors];
  newErrors[cellIndex] = false;

  const newNotes = state.notes.map((s, i) => (i === cellIndex ? new Set() : s));
  const history = [
    ...state.history,
    { cellIndex, prevValue, prevNotes, action: 'erase' },
  ];

  return { ...state, board: newBoard, notes: newNotes, errors: newErrors, history };
}

export function undoMove(state) {
  if (state.history.length === 0) return state;

  const last = state.history[state.history.length - 1];
  const newBoard = [...state.board];
  newBoard[last.cellIndex] = last.prevValue;

  const newErrors = [...state.errors];
  newErrors[last.cellIndex] = false;

  const newNotes = state.notes.map((s, i) => (i === last.cellIndex ? new Set(last.prevNotes) : s));

  return {
    ...state,
    board: newBoard,
    notes: newNotes,
    errors: newErrors,
    history: state.history.slice(0, -1),
  };
}

export function checkWin(state) {
  for (let i = 0; i < 81; i++) {
    if (state.board[i] !== state.solution[i]) return false;
  }
  return true;
}

export function autoNotes(state) {
  const newNotes = state.notes.map((s, i) => {
    if (state.board[i] !== 0) return new Set();

    const used = new Set();
    for (let j = 0; j < 81; j++) {
      if (j !== i && sharesUnit(j, i) && state.board[j] !== 0) {
        used.add(state.board[j]);
      }
    }

    const candidates = new Set();
    for (let n = 1; n <= 9; n++) {
      if (!used.has(n)) candidates.add(n);
    }
    return candidates;
  });

  return { ...state, notes: newNotes };
}

export function getHint(state) {
  for (let i = 0; i < 81; i++) {
    if (state.board[i] === 0 && state.given[i] === 0) {
      return { index: i, value: state.solution[i] };
    }
  }
  return null;
}
