import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, createBoard, neighbors } from '../src/board.js';

test('DIFFICULTIES has the three classic presets', () => {
  assert.deepEqual(DIFFICULTIES.easy, { rows: 9, cols: 9, mines: 10 });
  assert.deepEqual(DIFFICULTIES.medium, { rows: 16, cols: 16, mines: 40 });
  assert.deepEqual(DIFFICULTIES.hard, { rows: 16, cols: 30, mines: 99 });
});

test('createBoard builds a ready board with correct size, no mines yet', () => {
  const board = createBoard('easy');
  assert.equal(board.rows, 9);
  assert.equal(board.cols, 9);
  assert.equal(board.mines, 10);
  assert.equal(board.cells.length, 81);
  assert.equal(board.status, 'ready');
  for (const cell of board.cells) {
    assert.equal(cell.state, 'hidden');
    assert.equal(cell.mine, false);
    assert.equal(cell.adj, 0);
  }
});

test('createBoard falls back to easy for unknown/unsafe difficulty key (SEC-3)', () => {
  assert.equal(createBoard('nope').rows, 9);
  assert.equal(createBoard('__proto__').rows, 9);
  assert.equal(createBoard('constructor').rows, 9);
});

test('neighbors: corner cell has 3 neighbors', () => {
  const board = createBoard('easy'); // 9x9
  const ns = neighbors(board, 0);
  assert.equal(ns.length, 3);
  assert.deepEqual(new Set(ns), new Set([1, 9, 10]));
});

test('neighbors: top-edge (non-corner) cell has 5 neighbors', () => {
  const board = createBoard('easy');
  assert.equal(neighbors(board, 1).length, 5);
});

test('neighbors: interior cell has 8 neighbors', () => {
  const board = createBoard('easy');
  assert.equal(neighbors(board, 10).length, 8);
});

test('neighbors: row wraparound is forbidden (right-edge cell excludes next-row col 0)', () => {
  const board = createBoard('easy'); // cols=9, index 8 = row0 col8 (right edge)
  const ns = neighbors(board, 8);
  assert.ok(!ns.includes(9)); // col0 of next row must NOT be a neighbor
  assert.equal(ns.length, 5);
});

test('neighbors: out-of-range/invalid index returns empty array, no throw (SEC-2)', () => {
  const board = createBoard('easy');
  assert.deepEqual(neighbors(board, -1), []);
  assert.deepEqual(neighbors(board, board.cells.length), []);
  assert.deepEqual(neighbors(board, NaN), []);
  assert.deepEqual(neighbors(board, undefined), []);
});
