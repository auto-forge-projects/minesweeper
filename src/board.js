// Pure game core — no DOM access here (see docs/05-architecture.md, DL-05-001).

export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ rows: 9, cols: 9, mines: 10 }),
  medium: Object.freeze({ rows: 16, cols: 16, mines: 40 }),
  hard: Object.freeze({ rows: 16, cols: 30, mines: 99 }),
});

// SEC-2: single source of truth for index validation. Never throws — an invalid
// index is treated as a no-op by every public function that uses it.
function isValidIndex(board, i) {
  return Number.isInteger(i) && i >= 0 && i < board.cells.length;
}

// SEC-3: allowlist difficulty key; unknown/unsafe keys (including prototype-pollution
// vectors like `__proto__`/`constructor`/`prototype`) fall back to 'easy'.
function resolveDifficulty(key) {
  return Object.hasOwn(DIFFICULTIES, key) ? key : 'easy';
}

export function createBoard(key) {
  const { rows, cols, mines } = DIFFICULTIES[resolveDifficulty(key)];
  const cells = new Array(rows * cols);
  for (let i = 0; i < cells.length; i++) {
    cells[i] = { mine: false, adj: 0, state: 'hidden' };
  }
  return { rows, cols, mines, cells, status: 'ready', revealedCount: 0, flagCount: 0 };
}

// NFR-2: the ONLY place 8-neighborhood adjacency is computed, so `adj` (placeMines)
// and any future consumer always agree with a single source of truth.
export function neighbors(board, i) {
  if (!isValidIndex(board, i)) return [];
  const { rows, cols } = board;
  const r = Math.floor(i / cols);
  const c = i % cols;
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue; // no row wraparound
      result.push(nr * cols + nc);
    }
  }
  return result;
}

// DL-05-003: tembel (lazy) mayın yerleşimi — `safeIndex` + komşuları asla mayınlı olamaz (NFR-4).
// DL-04-001: Fisher-Yates shuffle.
export function placeMines(board, safeIndex, rng = Math.random) {
  const forbidden = new Set([safeIndex, ...neighbors(board, safeIndex)]);
  const candidates = [];
  for (let i = 0; i < board.cells.length; i++) {
    if (!forbidden.has(i)) candidates.push(i);
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const mineCount = Math.min(board.mines, candidates.length);
  for (let k = 0; k < mineCount; k++) {
    board.cells[candidates[k]].mine = true;
  }
  for (let i = 0; i < board.cells.length; i++) {
    if (board.cells[i].mine) continue;
    let count = 0;
    for (const n of neighbors(board, i)) {
      if (board.cells[n].mine) count++;
    }
    board.cells[i].adj = count;
  }
  board.status = 'playing';
  return board;
}

// DL-04-002: iteratif yığın ile flood-fill (rekürsif DFS yerine — derin özyineleme riski yok).
// DL-05-004: mutasyon fonksiyonları `changed[]` döndürür (render.js girdisi).
export function revealCell(board, i, rng = Math.random) {
  if (!isValidIndex(board, i)) return { changed: [], status: board.status };
  if (board.status === 'won' || board.status === 'lost') return { changed: [], status: board.status };
  const cell = board.cells[i];
  if (cell.state !== 'hidden') return { changed: [], status: board.status };

  if (board.status === 'ready') {
    placeMines(board, i, rng);
  }

  const changed = [];

  if (board.cells[i].mine) {
    for (let idx = 0; idx < board.cells.length; idx++) {
      if (board.cells[idx].mine && board.cells[idx].state !== 'revealed') {
        board.cells[idx].state = 'revealed';
        changed.push(idx);
      }
    }
    board.cells[i].triggered = true;
    board.status = 'lost';
    return { changed, status: board.status };
  }

  const stack = [i];
  while (stack.length) {
    const idx = stack.pop();
    const c = board.cells[idx];
    if (c.state !== 'hidden') continue;
    c.state = 'revealed';
    board.revealedCount++;
    changed.push(idx);
    if (c.adj === 0) {
      for (const n of neighbors(board, idx)) {
        if (board.cells[n].state === 'hidden') stack.push(n);
      }
    }
  }

  const nonMineCells = board.cells.length - board.mines;
  if (board.revealedCount >= nonMineCells) {
    board.status = 'won';
  }
  return { changed, status: board.status };
}

// FR-3: yalnız hidden<->flagged geçer; won/lost (kilitli tahta) veya revealed etkisizdir.
export function toggleFlag(board, i) {
  const flagsLeft = () => board.mines - board.flagCount;
  if (!isValidIndex(board, i)) return { changed: [], flagsLeft: flagsLeft() };
  if (board.status === 'won' || board.status === 'lost') return { changed: [], flagsLeft: flagsLeft() };

  const cell = board.cells[i];
  if (cell.state === 'hidden') {
    cell.state = 'flagged';
    board.flagCount++;
    return { changed: [i], flagsLeft: flagsLeft() };
  }
  if (cell.state === 'flagged') {
    cell.state = 'hidden';
    board.flagCount--;
    return { changed: [i], flagsLeft: flagsLeft() };
  }
  return { changed: [], flagsLeft: flagsLeft() };
}
