import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoard, revealCell, toggleFlag } from '../src/board.js';

test('toggleFlag: hidden -> flagged -> hidden, flagCount tracks it', () => {
  const board = createBoard('easy');
  let r = toggleFlag(board, 3);
  assert.equal(board.cells[3].state, 'flagged');
  assert.deepEqual(r.changed, [3]);
  assert.equal(r.flagsLeft, board.mines - 1);

  r = toggleFlag(board, 3);
  assert.equal(board.cells[3].state, 'hidden');
  assert.equal(r.flagsLeft, board.mines);
});

test('toggleFlag: flagged cell cannot be revealed by revealCell (FR-2)', () => {
  const board = createBoard('easy');
  toggleFlag(board, 7);
  const r = revealCell(board, 7);
  assert.deepEqual(r.changed, []);
  assert.equal(board.cells[7].state, 'flagged');
});

test('toggleFlag: revealed cell is unaffected by toggleFlag (FR-3)', () => {
  const board = createBoard('easy');
  board.status = 'playing';
  board.cells[9].state = 'revealed';
  const r = toggleFlag(board, 9);
  assert.deepEqual(r.changed, []);
  assert.equal(board.cells[9].state, 'revealed');
});

test('toggleFlag: SEC-2 invalid indices are no-ops, never throw', () => {
  const board = createBoard('easy');
  for (const bad of [-1, board.cells.length, NaN, undefined]) {
    assert.doesNotThrow(() => toggleFlag(board, bad));
    assert.deepEqual(toggleFlag(board, bad).changed, []);
  }
});

test('win: revealing every non-mine cell sets status to won, 100% correctly', () => {
  const board = createBoard('easy');
  board.mines = 1;
  board.cells[0].mine = true;
  board.status = 'playing';
  let last;
  for (let i = 1; i < board.cells.length; i++) {
    last = revealCell(board, i);
  }
  assert.equal(last.status, 'won');
  assert.equal(board.status, 'won');
});

test('win: NOT triggered while at least one non-mine cell remains hidden', () => {
  const board = createBoard('easy');
  board.mines = 1;
  board.cells[0].mine = true;
  board.status = 'playing';
  for (let i = 1; i < board.cells.length - 1; i++) {
    revealCell(board, i);
  }
  assert.notEqual(board.status, 'won');
});

test('lost: locks the board — further revealCell/toggleFlag calls are no-ops', () => {
  const board = createBoard('easy');
  board.status = 'playing';
  board.cells[2].mine = true;
  revealCell(board, 2);
  assert.equal(board.status, 'lost');
  assert.deepEqual(revealCell(board, 10).changed, []);
  assert.deepEqual(toggleFlag(board, 10).changed, []);
});

test('won: locks the board — further revealCell/toggleFlag calls are no-ops', () => {
  const board = createBoard('easy');
  board.mines = 1;
  board.cells[0].mine = true;
  board.status = 'playing';
  for (let i = 1; i < board.cells.length; i++) revealCell(board, i);
  assert.equal(board.status, 'won');
  assert.deepEqual(revealCell(board, 0).changed, []);
  assert.deepEqual(toggleFlag(board, 0).changed, []);
});
