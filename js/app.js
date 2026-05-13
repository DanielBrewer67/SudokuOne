import { fetchPuzzle } from './api.js';
import {
  createPuzzle, applyMove, applyNote, eraseCell, undoMove,
  checkWin, getHint, autoNotes, isCellEditable,
} from './puzzle.js';
import { createTimer, formatTime } from './timer.js';
import { loadStats, saveGameResult, getAggregateStats } from './stats.js';
import {
  renderBoard, renderNumpad, renderInfoBar, renderStats,
  showWinOverlay, hideWinOverlay, showLoading, showNewGameModal,
  hideNewGameModal, showToast, shakeCellAt, setPencilActive, bindEvents,
} from './ui.js';

let puzzleState = null;
let selectedCell = null;
let pencilMode = false;
let timer = null;
let currentGameMeta = null;
let currentPanel = 'game';

function onCellClick(cellIndex) {
  if (!puzzleState) return;
  if (selectedCell === cellIndex) {
    selectedCell = null;
  } else {
    selectedCell = cellIndex;
  }
  renderBoard(puzzleState, selectedCell, pencilMode);
}

function onNumpadClick(value) {
  if (selectedCell === null || !puzzleState) return;
  if (!isCellEditable(puzzleState, selectedCell)) return;

  let newState;
  if (pencilMode) {
    newState = applyNote(puzzleState, selectedCell, value);
  } else {
    const prevErrors = puzzleState.errorCount;
    newState = applyMove(puzzleState, selectedCell, value);
    if (newState.errorCount > prevErrors) {
      shakeCellAt(selectedCell);
    }
  }
  puzzleState = newState;
  renderBoard(puzzleState, selectedCell, pencilMode);
  renderInfoBar(puzzleState, timer ? timer.getElapsed() : 0);

  if (!pencilMode && checkWin(puzzleState)) {
    handleWin();
  }
}

function onKeyDown(e) {
  const key = e.key;

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    e.preventDefault();
    moveSelection(key);
    return;
  }

  if (key >= '1' && key <= '9') {
    onNumpadClick(parseInt(key));
    return;
  }

  if (key === 'Backspace' || key === 'Delete' || key === '0') {
    onErase();
    return;
  }

  if (key === 'p' || key === 'P') {
    onPencilToggle();
    return;
  }

  if (key === 'z' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    onUndo();
    return;
  }
}

function moveSelection(direction) {
  if (selectedCell === null) {
    selectedCell = 40;
  } else {
    let row = Math.floor(selectedCell / 9);
    let col = selectedCell % 9;
    if (direction === 'ArrowUp')    row = Math.max(0, row - 1);
    if (direction === 'ArrowDown')  row = Math.min(8, row + 1);
    if (direction === 'ArrowLeft')  col = Math.max(0, col - 1);
    if (direction === 'ArrowRight') col = Math.min(8, col + 1);
    selectedCell = row * 9 + col;
  }
  renderBoard(puzzleState, selectedCell, pencilMode);
}

function onPencilToggle() {
  pencilMode = !pencilMode;
  setPencilActive(pencilMode);
}

function onErase() {
  if (selectedCell === null || !puzzleState) return;
  puzzleState = eraseCell(puzzleState, selectedCell);
  renderBoard(puzzleState, selectedCell, pencilMode);
  renderInfoBar(puzzleState, timer ? timer.getElapsed() : 0);
}

function onUndo() {
  if (!puzzleState) return;
  puzzleState = undoMove(puzzleState);
  renderBoard(puzzleState, selectedCell, pencilMode);
  renderInfoBar(puzzleState, timer ? timer.getElapsed() : 0);
}

function onAutoNotes() {
  if (!puzzleState) return;
  puzzleState = autoNotes(puzzleState);
  renderBoard(puzzleState, selectedCell, pencilMode);
}

function onHint() {
  if (!puzzleState) return;
  const hint = getHint(puzzleState);
  if (!hint) {
    showToast('No hints available — board is complete!');
    return;
  }
  const prevErrors = puzzleState.errorCount;
  puzzleState = { ...puzzleState, hintsUsed: (puzzleState.hintsUsed || 0) + 1 };
  puzzleState = applyMove(puzzleState, hint.index, hint.value);
  selectedCell = hint.index;
  renderBoard(puzzleState, selectedCell, pencilMode);
  renderInfoBar(puzzleState, timer ? timer.getElapsed() : 0);

  if (checkWin(puzzleState)) {
    handleWin();
  }
}

function onNewGameRequest() {
  showNewGameModal();
}

function onDifficultySelect(difficulty) {
  hideNewGameModal();
  startNewGame(difficulty);
}

function onModalCancel() {
  hideNewGameModal();
}

function onStatsToggle() {
  if (currentPanel === 'stats') {
    showGamePanel();
  } else {
    showStatsPanel();
  }
}

function onWinNewGame() {
  hideWinOverlay();
  showNewGameModal();
}

function showGamePanel() {
  currentPanel = 'game';
  document.getElementById('game-panel').removeAttribute('hidden');
  document.getElementById('stats-panel').setAttribute('hidden', '');
  document.getElementById('btn-stats').textContent = 'Stats';
  if (timer && puzzleState && !checkWin(puzzleState)) {
    timer.resume();
  }
}

function showStatsPanel() {
  currentPanel = 'stats';
  document.getElementById('game-panel').setAttribute('hidden', '');
  document.getElementById('stats-panel').removeAttribute('hidden');
  document.getElementById('btn-stats').textContent = '← Back';
  if (timer) timer.pause();

  const store = loadStats();
  const agg = getAggregateStats(store);
  renderStats(agg);
}

function handleWin() {
  if (!timer) return;
  timer.stop();
  const elapsed = timer.getElapsed();

  saveGameResult({
    difficulty: currentGameMeta.difficulty,
    status: 'completed',
    startedAt: currentGameMeta.startedAt,
    elapsedSec: elapsed,
    errorCount: puzzleState.errorCount,
    hintsUsed: puzzleState.hintsUsed || 0,
  });

  launchConfetti();
  showWinOverlay(puzzleState, elapsed);
}

async function startNewGame(difficulty) {
  // Save abandoned game if one is in progress
  if (puzzleState && !checkWin(puzzleState) && timer) {
    saveGameResult({
      difficulty: currentGameMeta.difficulty,
      status: 'abandoned',
      startedAt: currentGameMeta.startedAt,
      elapsedSec: timer.getElapsed(),
      errorCount: puzzleState.errorCount,
      hintsUsed: puzzleState.hintsUsed || 0,
    });
  }

  if (timer) timer.stop();
  selectedCell = null;
  pencilMode = false;
  setPencilActive(false);

  showLoading(true);

  try {
    const rawPuzzle = await fetchPuzzle();
    puzzleState = createPuzzle(rawPuzzle, difficulty);
    currentGameMeta = { difficulty, startedAt: Date.now() };

    timer = createTimer(elapsed => {
      renderInfoBar(puzzleState, elapsed);
    });
    timer.start();

    renderBoard(puzzleState, selectedCell, pencilMode);
    renderInfoBar(puzzleState, 0);
  } catch (err) {
    showToast(`Couldn't fetch puzzle: ${err.message}. Please try again.`, true);
  } finally {
    showLoading(false);
  }
}

function launchConfetti() {
  const colors = ['#e94560', '#533483', '#06d6a0', '#ffd166', '#7ec8e3', '#ff9f43'];
  const count = 40;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const size = 6 + Math.random() * 8;
    piece.style.cssText = `
      left: ${Math.random() * 100}vw;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${size}px;
      height: ${size}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration: ${1.5 + Math.random() * 2}s;
      animation-delay: ${Math.random() * 0.6}s;
    `;
    document.body.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderNumpad();
  bindEvents({
    onCellClick,
    onNumpadClick,
    onKeyDown,
    onPencilToggle,
    onErase,
    onUndo,
    onHint,
    onAutoNotes,
    onNewGameRequest,
    onDifficultySelect,
    onModalCancel,
    onStatsToggle,
    onWinNewGame,
  });

  // Auto-start a medium game
  startNewGame('medium');
});
