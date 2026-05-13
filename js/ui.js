import { getBox, getRelatedIndices } from './puzzle.js';
import { formatTime } from './timer.js';

export function renderBoard(state, selectedIndex, pencilMode) {
  const board = document.getElementById('board');
  board.innerHTML = '';

  const relatedSet = selectedIndex != null
    ? new Set(getRelatedIndices(selectedIndex))
    : new Set();

  const selectedValue = (selectedIndex != null && state.board[selectedIndex] > 0)
    ? state.board[selectedIndex]
    : 0;

  const sameNumberSet = selectedValue > 0
    ? new Set(state.board.reduce((acc, v, i) => { if (v === selectedValue) acc.push(i); return acc; }, []))
    : new Set();

  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    cell.dataset.row = Math.floor(i / 9);
    cell.dataset.col = i % 9;
    cell.dataset.box = getBox(i);

    const val = state.board[i];
    const isGiven = state.given[i] > 0;
    const hasNotes = state.notes[i].size > 0;

    if (val > 0) {
      cell.textContent = val;
      cell.classList.add(isGiven ? 'given' : 'user-entered');
    } else if (hasNotes) {
      cell.appendChild(buildNoteGrid(state.notes[i]));
      cell.classList.add('has-notes');
    }

    if (state.errors[i]) cell.classList.add('error');
    if (i === selectedIndex) cell.classList.add('selected');
    else if (relatedSet.has(i)) cell.classList.add('related');
    if (sameNumberSet.has(i) && i !== selectedIndex) cell.classList.add('same-number');
    if (!isGiven) cell.classList.add('editable');

    cell.setAttribute('role', 'gridcell');
    const row = Math.floor(i / 9) + 1;
    const col = (i % 9) + 1;
    const label = val > 0 ? val : (hasNotes ? 'notes' : 'empty');
    cell.setAttribute('aria-label', `Row ${row}, Column ${col}, ${label}`);
    if (state.errors[i]) cell.setAttribute('aria-invalid', 'true');

    board.appendChild(cell);
  }
}

function buildNoteGrid(noteSet) {
  const grid = document.createElement('div');
  grid.className = 'notes';
  for (let n = 1; n <= 9; n++) {
    const span = document.createElement('span');
    span.textContent = noteSet.has(n) ? n : '';
    grid.appendChild(span);
  }
  return grid;
}

export function renderNumpad() {
  const numpad = document.getElementById('numpad');
  numpad.innerHTML = '';
  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.className = 'numpad-btn';
    btn.textContent = n;
    btn.dataset.value = n;
    btn.setAttribute('aria-label', `Enter ${n}`);
    numpad.appendChild(btn);
  }
  const erase = document.createElement('button');
  erase.className = 'numpad-btn numpad-erase';
  erase.id = 'numpad-erase';
  erase.textContent = '⌫';
  erase.setAttribute('aria-label', 'Erase');
  numpad.appendChild(erase);
}

export function renderInfoBar(state, elapsedSec) {
  const diffBadge = document.getElementById('difficulty-badge');
  const timerEl = document.getElementById('timer');
  const progressEl = document.getElementById('progress');
  const progressBar = document.getElementById('progress-bar-fill');

  if (state) {
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    diffBadge.textContent = cap(state.difficulty);
    diffBadge.className = `difficulty-badge diff-${state.difficulty}`;

    const totalEmpty = state.given.filter(v => v === 0).length;
    const correctUser = state.board.filter((v, i) => v !== 0 && state.given[i] === 0 && v === state.solution[i]).length;

    progressEl.textContent = `${correctUser} / ${totalEmpty}`;
    if (progressBar) progressBar.style.width = `${(correctUser / 81) * 100}%`;

    if (state.errorCount > 0) {
      const errEl = document.getElementById('error-count');
      if (errEl) errEl.textContent = `${state.errorCount} error${state.errorCount !== 1 ? 's' : ''}`;
    }
  }

  timerEl.textContent = formatTime(elapsedSec);
}

export function renderStats(agg) {
  const el = document.getElementById('stats-content');
  const ft = s => s != null ? formatTime(s) : '—';
  const difficulties = ['easy', 'medium', 'hard', 'expert'];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  el.innerHTML = `
    <div class="stat-overview">
      <div class="stat-card">
        <span class="stat-value">${agg.totalPlayed}</span>
        <span class="stat-label">Played</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${agg.totalCompleted}</span>
        <span class="stat-label">Won</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${agg.totalPlayed > 0 ? Math.round(agg.totalCompleted / agg.totalPlayed * 100) : 0}%</span>
        <span class="stat-label">Win Rate</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${ft(agg.overallBestTimeSec)}</span>
        <span class="stat-label">Best Time</span>
      </div>
    </div>

    <h3 class="stats-section-title">By Difficulty</h3>
    <div class="stats-table-wrap">
      <table class="stats-table">
        <thead>
          <tr>
            <th>Level</th>
            <th>Played</th>
            <th>Won</th>
            <th>Best</th>
            <th>Avg</th>
            <th>Avg Errors</th>
          </tr>
        </thead>
        <tbody>
          ${difficulties.map(d => {
            const s = agg.byDifficulty[d];
            return `<tr>
              <td><span class="diff-pill diff-${d}">${cap(d)}</span></td>
              <td>${s.played}</td>
              <td>${s.completed}</td>
              <td>${ft(s.bestTimeSec)}</td>
              <td>${ft(s.avgTimeSec)}</td>
              <td>${s.avgErrors ?? '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <h3 class="stats-section-title">Recent Games</h3>
    <ul class="recent-games">
      ${agg.recentGames.length === 0
        ? '<li class="no-games">No games yet — start playing!</li>'
        : agg.recentGames.map(g => {
          const date = new Date(g.startedAt).toLocaleDateString();
          const statusIcon = g.status === 'completed' ? '✓' : '✗';
          const statusClass = g.status === 'completed' ? 'win' : 'loss';
          return `<li class="recent-game-row">
            <span class="rg-status ${statusClass}">${statusIcon}</span>
            <span class="rg-diff diff-${g.difficulty}">${cap(g.difficulty)}</span>
            <span class="rg-time">${ft(g.elapsedSec)}</span>
            <span class="rg-errors">${g.errorCount} err</span>
            <span class="rg-date">${date}</span>
          </li>`;
        }).join('')}
    </ul>
  `;
}

export function showWinOverlay(state, elapsedSec) {
  const overlay = document.getElementById('win-overlay');
  document.getElementById('win-time').textContent = `Time: ${formatTime(elapsedSec)}`;
  document.getElementById('win-errors').textContent =
    state.errorCount === 0
      ? 'Perfect — no errors!'
      : `Errors: ${state.errorCount}`;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  document.getElementById('win-difficulty').textContent = cap(state.difficulty);
  overlay.removeAttribute('hidden');
}

export function hideWinOverlay() {
  document.getElementById('win-overlay').setAttribute('hidden', '');
}

export function showLoading(visible) {
  const el = document.getElementById('loading-overlay');
  if (visible) el.removeAttribute('hidden');
  else el.setAttribute('hidden', '');
}

export function showNewGameModal() {
  const modal = document.getElementById('new-game-modal');
  modal.showModal();
}

export function hideNewGameModal() {
  const modal = document.getElementById('new-game-modal');
  if (modal.open) modal.close();
}

export function showToast(message, isError = false) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'toast' + (isError ? ' toast-error' : '');
  toast.removeAttribute('hidden');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.setAttribute('hidden', ''), 3500);
}

export function shakeCellAt(cellIndex) {
  const cell = document.querySelector(`.cell[data-index="${cellIndex}"]`);
  if (!cell) return;
  cell.classList.remove('shake');
  void cell.offsetWidth; // reflow to restart animation
  cell.classList.add('shake');
  setTimeout(() => cell.classList.remove('shake'), 400);
}

export function setPencilActive(active) {
  const btn = document.getElementById('btn-pencil');
  if (!btn) return;
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  btn.classList.toggle('active', active);
}

export function bindEvents(handlers) {
  // Board clicks
  document.getElementById('board').addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    handlers.onCellClick(parseInt(cell.dataset.index));
  });

  // Numpad
  document.getElementById('numpad').addEventListener('click', e => {
    const btn = e.target.closest('.numpad-btn');
    if (!btn) return;
    if (btn.id === 'numpad-erase') {
      handlers.onErase();
    } else {
      handlers.onNumpadClick(parseInt(btn.dataset.value));
    }
  });

  // Control buttons
  document.getElementById('btn-pencil').addEventListener('click', handlers.onPencilToggle);
  document.getElementById('btn-erase').addEventListener('click', handlers.onErase);
  document.getElementById('btn-undo').addEventListener('click', handlers.onUndo);
  document.getElementById('btn-hint').addEventListener('click', handlers.onHint);
  document.getElementById('btn-auto').addEventListener('click', handlers.onAutoNotes);
  document.getElementById('btn-new-game').addEventListener('click', handlers.onNewGameRequest);
  document.getElementById('btn-stats').addEventListener('click', handlers.onStatsToggle);

  // Modal
  document.getElementById('difficulty-buttons').addEventListener('click', e => {
    const btn = e.target.closest('[data-difficulty]');
    if (btn) handlers.onDifficultySelect(btn.dataset.difficulty);
  });
  document.getElementById('modal-cancel').addEventListener('click', handlers.onModalCancel);

  // Win overlay
  document.getElementById('win-new-game').addEventListener('click', handlers.onWinNewGame);

  // Keyboard
  document.addEventListener('keydown', e => handlers.onKeyDown(e));
}
