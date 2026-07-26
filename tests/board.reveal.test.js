import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoard, neighbors, placeMines, revealCell } from '../src/board.js';

function countRealAdjacency(board) {
  // Independent brute-force recomputation of adjacency, used to cross-check board.cells[i].adj.
  const out = new Array(board.cells.length).fill(0);
  for (let i = 0; i < board.cells.length; i++) {
    if (board.cells[i].mine) continue;
    let c = 0;
    for (const n of neighbors(board, i)) if (board.cells[n].mine) c++;
    out[i] = c;
  }
  return out;
}

test('placeMines: exact mine count placed, safeIndex + its neighbors never mined', () => {
  const board = createBoard('easy');
  const safe = 40; // interior cell
  const forbidden = new Set([safe, ...neighbors(board, safe)]);
  placeMines(board, safe, Math.random);
  let mineCount = 0;
  for (let i = 0; i < board.cells.length; i++) {
    if (board.cells[i].mine) {
      mineCount++;
      assert.ok(!forbidden.has(i), `cell ${i} should not be mined (forbidden zone)`);
    }
  }
  assert.equal(mineCount, board.mines);
  assert.equal(board.status, 'playing');
});

test('placeMines: adj matches real neighbor-mine count for every cell (NFR-2)', () => {
  const board = createBoard('medium');
  placeMines(board, 0, Math.random);
  const expected = countRealAdjacency(board);
  for (let i = 0; i < board.cells.length; i++) {
    if (board.cells[i].mine) continue;
    assert.equal(board.cells[i].adj, expected[i], `mismatch at cell ${i}`);
  }
});

test('revealCell: first reveal on a ready board is lazy-safe (NFR-4), never a mine', () => {
  for (let seed = 0; seed < 200; seed++) {
    const board = createBoard('easy');
    let call = seed; // deterministic pseudo-rng so failures are reproducible
    const rng = () => {
      call = (call * 1103515245 + 12345) & 0x7fffffff;
      return (call % 1000) / 1000;
    };
    const i = seed % board.cells.length;
    const result = revealCell(board, i, rng);
    assert.equal(board.cells[i].mine, false);
    assert.notEqual(result.status, 'lost');
  }
});

test('revealCell: revealing a zero-adjacency cell flood-fills its region', () => {
  const board = createBoard('easy');
  // Force a fully-known board: no mines at all, so every reveal flood-fills to completion.
  board.mines = 0;
  const result = revealCell(board, 0, () => 0.999); // rng never picked since no mines to place
  assert.equal(result.status, 'won'); // all non-mine cells revealed in one flood-fill
  assert.equal(result.changed.length, board.cells.length);
});

test('revealCell: clicking a mine reveals ALL mines and sets status lost', () => {
  const board = createBoard('easy');
  board.status = 'playing';
  board.cells[5].mine = true;
  board.cells[42].mine = true;
  const result = revealCell(board, 5);
  assert.equal(result.status, 'lost');
  assert.equal(board.status, 'lost');
  assert.ok(board.cells[5].state === 'revealed');
  assert.ok(board.cells[42].state === 'revealed');
  assert.ok(result.changed.includes(5));
  assert.ok(result.changed.includes(42));
});

test('revealCell: SEC-2 invalid indices are no-ops, never throw', () => {
  const board = createBoard('easy');
  for (const bad of [-1, board.cells.length, NaN, undefined, 3.5]) {
    assert.doesNotThrow(() => revealCell(board, bad));
    const r = revealCell(board, bad);
    assert.deepEqual(r.changed, []);
  }
});
