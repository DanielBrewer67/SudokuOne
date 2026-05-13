const STORAGE_KEY = 'sudoku_stats';
const SCHEMA_VERSION = 1;

export function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== SCHEMA_VERSION) return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

function emptyStore() {
  return { version: SCHEMA_VERSION, games: [] };
}

export function saveGameResult(result) {
  const store = loadStats();
  store.games.push({
    id: crypto.randomUUID(),
    difficulty: result.difficulty,
    status: result.status,
    startedAt: result.startedAt,
    completedAt: result.status === 'completed' ? Date.now() : 0,
    elapsedSec: result.elapsedSec,
    errorCount: result.errorCount,
    hintsUsed: result.hintsUsed,
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full — silently fail
  }
}

export function getAggregateStats(store) {
  const games = store.games;
  const completed = games.filter(g => g.status === 'completed');

  const difficulties = ['easy', 'medium', 'hard', 'expert'];
  const byDifficulty = {};

  for (const diff of difficulties) {
    const dGames = games.filter(g => g.difficulty === diff);
    const dWins = dGames.filter(g => g.status === 'completed');
    byDifficulty[diff] = {
      played: dGames.length,
      completed: dWins.length,
      bestTimeSec: dWins.length ? Math.min(...dWins.map(g => g.elapsedSec)) : null,
      avgTimeSec: dWins.length ? Math.round(avg(dWins.map(g => g.elapsedSec))) : null,
      avgErrors: dWins.length ? Math.round(avg(dWins.map(g => g.errorCount)) * 10) / 10 : null,
    };
  }

  return {
    totalPlayed: games.length,
    totalCompleted: completed.length,
    totalAbandoned: games.length - completed.length,
    byDifficulty,
    totalErrors: games.reduce((sum, g) => sum + g.errorCount, 0),
    overallBestTimeSec: completed.length ? Math.min(...completed.map(g => g.elapsedSec)) : null,
    recentGames: [...games].reverse().slice(0, 10),
  };
}

export function clearStats() {
  localStorage.removeItem(STORAGE_KEY);
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
