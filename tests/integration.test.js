import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, createBoard, neighbors, revealCell, toggleFlag } from '../src/board.js';

// Deterministic, seedable PRNG (LCG) so a failure is reproducible without external deps (SEC-6).
function makeRng(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

test('NFR-4: across 1000 random seeds x all difficulties, the first click is never a mine', () => {
  for (const key of Object.keys(DIFFICULTIES)) {
    for (let seed = 1; seed <= 1000; seed++) {
      const board = createBoard(key);
      const rng = makeRng(seed);
      const i = seed % board.cells.length;
      const result = revealCell(board, i, rng);
      assert.equal(board.cells[i].mine, false, `difficulty=${key} seed=${seed} index=${i} was a mine`);
      assert.notEqual(result.status, 'lost', `difficulty=${key} seed=${seed} first click lost`);
      assert.equal(board.mines, DIFFICULTIES[key].mines);
    }
  }
});

test('NFR-2: adj invariant — every non-mine cell adj equals its real 8-neighbor mine count', () => {
  for (const key of Object.keys(DIFFICULTIES)) {
    for (let seed = 1; seed <= 25; seed++) {
      const board = createBoard(key);
      const rng = makeRng(seed * 7919);
      revealCell(board, 0, rng);
      for (let i = 0; i < board.cells.length; i++) {
        if (board.cells[i].mine) continue;
        let real = 0;
        for (const n of neighbors(board, i)) if (board.cells[n].mine) real++;
        assert.equal(board.cells[i].adj, real, `difficulty=${key} seed=${seed} cell=${i}`);
      }
      // Sanity: exactly the configured mine count was placed.
      const mineCount = board.cells.filter((c) => c.mine).length;
      assert.equal(mineCount, DIFFICULTIES[key].mines);
    }
  }
});

test('locked board (won): revealCell/toggleFlag are no-ops afterwards, changed:[] always', () => {
  const board = createBoard('easy');
  board.mines = 1;
  board.cells[0].mine = true;
  board.status = 'playing';
  let last;
  for (let i = 1; i < board.cells.length; i++) last = revealCell(board, i);
  assert.equal(last.status, 'won');

  for (const i of [1, 5, 9, 79]) {
    assert.deepEqual(revealCell(board, i).changed, []);
    assert.deepEqual(toggleFlag(board, i).changed, []);
  }
});

test('locked board (lost): revealCell/toggleFlag are no-ops afterwards, changed:[] always', () => {
  const board = createBoard('easy');
  board.status = 'playing';
  board.cells[15].mine = true;
  const result = revealCell(board, 15);
  assert.equal(result.status, 'lost');

  for (const i of [0, 1, 40, 80]) {
    assert.deepEqual(revealCell(board, i).changed, []);
    assert.deepEqual(toggleFlag(board, i).changed, []);
  }
});
