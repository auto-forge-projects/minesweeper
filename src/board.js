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
