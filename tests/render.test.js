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

test('SEC-1 (F3): no src/*.js file uses innerHTML/outerHTML-family DOM writes (=, +=, insertAdjacentHTML, ...)', async () => {
  const fs = await import('node:fs');
  const dir = new URL('../src/', import.meta.url);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  assert.ok(files.length > 0, 'expected at least one src/*.js file to scan');
  const forbidden = /\.innerHTML\s*\+?=|\.outerHTML\s*\+?=|insertAdjacentHTML\(|document\.write\(|eval\(|new Function\(/;
  for (const file of files) {
    const src = fs.readFileSync(new URL(file, dir), 'utf8');
    assert.doesNotMatch(src, forbidden, `${file} must not use innerHTML-family DOM writes`);
  }
});

test('updateCells: only touches the given indices, leaves the rest untouched', () => {
  const board = createBoard('easy');
  const el = new FakeElement('div');
  mountBoard(el, board);

  board.cells[10].state = 'revealed';
  board.cells[10].adj = 3;
  updateCells(el, board, [10]);

  assert.ok(el.children[10].classList.contains('revealed'));
  assert.equal(el.children[10].textContent, '3');
  assert.ok(el.children[0].classList.contains('hidden')); // untouched
  assert.ok(el.children[20].classList.contains('hidden')); // untouched
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

// Faz 11 (Test) — closes PR-1 review finding F11's second part: "kaybetme render'ı
// (mine-triggered) hiç test edilmemiş" (docs/10-review/PR-1.md F5/F11). Distinguishes the
// exploded mine (`.mine-triggered`, FR-4) from the other mines revealed alongside it
// (`.mine` only — the board-lock reveal per FR-4, not the one the player actually clicked).
test('losing render: exploded mine gets mine-triggered class, other revealed mines get mine class only', () => {
  const board = createBoard('easy');
  const el = new FakeElement('div');
  mountBoard(el, board);

  board.status = 'playing';
  board.cells[5].mine = true;
  board.cells[42].mine = true;
  const { changed, status } = revealCell(board, 5); // clicks the mine at 5 -> reveals all mines
  updateCells(el, board, changed);

  assert.equal(status, 'lost');
  assert.ok(el.children[5].classList.contains('mine'));
  assert.ok(el.children[5].classList.contains('mine-triggered'));
  assert.equal(el.children[5].textContent, '💣');

  assert.ok(el.children[42].classList.contains('mine'));
  assert.ok(!el.children[42].classList.contains('mine-triggered'), 'only the clicked mine gets mine-triggered');
  assert.equal(el.children[42].textContent, '💣');
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
