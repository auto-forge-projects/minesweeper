import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeDocument, FakeElement, FakeEvent } from './helpers/fake-dom.js';

globalThis.document = createFakeDocument();
const { initApp } = await import('../src/app.js');

function buildRoot() {
  const root = new FakeElement('div');
  const difficulty = new FakeElement('select');
  difficulty.setAttribute('id', 'difficulty');
  difficulty.value = 'easy';
  const newGameBtn = new FakeElement('button');
  newGameBtn.setAttribute('id', 'new-game');
  const board = new FakeElement('div');
  board.setAttribute('id', 'board');
  const status = new FakeElement('div');
  status.setAttribute('id', 'status');

  root.appendChild(difficulty);
  root.appendChild(newGameBtn);
  root.appendChild(board);
  root.appendChild(status);
  return { root, difficulty, newGameBtn, board, status };
}

test('initApp: mounts a board for the initial difficulty (FR-1)', () => {
  const { root, board } = buildRoot();
  initApp(root);
  assert.equal(board.children.length, 81); // easy = 9x9
});

test('initApp: click on a cell reveals it (FR-2)', () => {
  const { root, board, status } = buildRoot();
  initApp(root);
  const cellEl = board.children[40];
  board.dispatchEvent(new FakeEvent('click', { target: cellEl }));
  assert.ok(cellEl.classList.contains('revealed'));
  assert.match(status.textContent, /Kalan bayrak/);
});

test('initApp: contextmenu on a cell toggles a flag and prevents the default menu (FR-3)', () => {
  const { root, board } = buildRoot();
  initApp(root);
  const cellEl = board.children[12];
  const evt = new FakeEvent('contextmenu', { target: cellEl });
  board.dispatchEvent(evt);
  assert.ok(evt.defaultPrevented);
  assert.ok(cellEl.classList.contains('flagged'));
});

test('initApp: flagged cell does not open on click (FR-2)', () => {
  const { root, board } = buildRoot();
  initApp(root);
  const cellEl = board.children[12];
  board.dispatchEvent(new FakeEvent('contextmenu', { target: cellEl }));
  board.dispatchEvent(new FakeEvent('click', { target: cellEl }));
  assert.ok(cellEl.classList.contains('flagged'));
  assert.ok(!cellEl.classList.contains('revealed'));
});

test('initApp: long touch (~500ms) toggles a flag; short touch does not (FR-3)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'clearTimeout'] });
  const { root, board } = buildRoot();
  initApp(root);

  const shortCell = board.children[1];
  board.dispatchEvent(new FakeEvent('touchstart', { target: shortCell }));
  t.mock.timers.tick(200);
  board.dispatchEvent(new FakeEvent('touchend', { target: shortCell }));
  t.mock.timers.tick(400);
  assert.ok(!shortCell.classList.contains('flagged'));

  const longCell = board.children[2];
  board.dispatchEvent(new FakeEvent('touchstart', { target: longCell }));
  t.mock.timers.tick(500);
  assert.ok(longCell.classList.contains('flagged'));
});

test('initApp: changing difficulty starts a fresh board of the new size (FR-1/FR-6)', () => {
  const { root, difficulty, board } = buildRoot();
  initApp(root);
  difficulty.value = 'medium';
  difficulty.dispatchEvent(new FakeEvent('change', { target: difficulty }));
  assert.equal(board.children.length, 256); // medium = 16x16
});

test('initApp: SEC-3 unsafe/unknown difficulty value falls back to easy', () => {
  const { root, difficulty, board } = buildRoot();
  initApp(root);
  difficulty.value = '__proto__';
  difficulty.dispatchEvent(new FakeEvent('change', { target: difficulty }));
  assert.equal(board.children.length, 81);
});

test('initApp: "Yeni Oyun" button resets the board (FR-6)', () => {
  const { root, board, newGameBtn } = buildRoot();
  initApp(root);
  board.dispatchEvent(new FakeEvent('click', { target: board.children[40] }));
  assert.ok(board.children[40].classList.contains('revealed'));
  newGameBtn.dispatchEvent(new FakeEvent('click', { target: newGameBtn }));
  assert.ok(board.children[40].classList.contains('hidden'));
});
