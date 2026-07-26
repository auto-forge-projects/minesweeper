import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoard, revealCell } from '../src/board.js';
import { createFakeDocument, FakeElement } from './helpers/fake-dom.js';

// render.js uses the global `document` (as real browser code does) — inject a fake one
// before importing, so tests run under plain node:test with zero dependencies (SEC-6).
globalThis.document = createFakeDocument();
const { mountBoard, updateCells, setStatus } = await import('../src/render.js');

test('mountBoard: creates one child per cell, in index order, sets grid-template-columns', () => {
  const board = createBoard('easy');
  const el = new FakeElement('div');
  mountBoard(el, board);
  assert.equal(el.children.length, board.cells.length);
  assert.equal(el.style.gridTemplateColumns, 'repeat(9, 1fr)');
  assert.equal(el.children[0].dataset.i, '0');
  assert.equal(el.children[80].dataset.i, '80');
  assert.ok(el.children[0].classList.contains('hidden'));
});

test('mountBoard uses ONLY textContent/className — no innerHTML anywhere in render.js source (SEC-1)', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/render.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/);
});

test('updateCells: only touches the given indices, reflects revealed number + mine state', () => {
  const board = createBoard('easy');
  board.mines = 1;
  board.cells[0].mine = true;
  board.status = 'playing';
  const el = new FakeElement('div');
  mountBoard(el, board);

  const { changed } = revealCell(board, 40); // interior cell, far from the single mine
  updateCells(el, board, changed);
  for (const i of changed) {
    assert.ok(el.children[i].classList.contains('revealed'));
    // untouched cells remain hidden
  }
  assert.ok(el.children[0].classList.contains('hidden')); // mine cell untouched, still hidden
});

test('updateCells: flagged cell shows the flag glyph, revealed mine shows the mine glyph', () => {
  const board = createBoard('easy');
  const el = new FakeElement('div');
  mountBoard(el, board);
  board.cells[3].state = 'flagged';
  updateCells(el, board, [3]);
  assert.equal(el.children[3].textContent, '🚩');

  board.cells[5].mine = true;
  board.cells[5].state = 'revealed';
  updateCells(el, board, [5]);
  assert.equal(el.children[5].textContent, '💣');
  assert.ok(el.children[5].classList.contains('mine'));
});

test('setStatus: shows remaining-flags while playing, win/lose messages otherwise', () => {
  const board = createBoard('easy');
  const el = new FakeElement('div');
  setStatus(el, board);
  assert.match(el.textContent, /Kalan bayrak: 10/);

  board.status = 'won';
  setStatus(el, board);
  assert.match(el.textContent, /Kazandın/);

  board.status = 'lost';
  setStatus(el, board);
  assert.match(el.textContent, /Kaybettin/);
});
